import { PDFPage } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface AISummaryData {
  content: string;
}

export interface AISummaryResult {
  y: number;
  overflow: ContentBlock[];  // Blocks that didn't fit
}

// Content block types for structured rendering
interface ContentBlock {
  type: 'h1' | 'h2' | 'paragraph' | 'list-item';
  text: string;
}

// Parse HTML content into structured blocks
function parseHTMLContent(html: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  // Clean up the HTML
  let content = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove ul/ol tags but keep li
    .replace(/<\/?ul[^>]*>/gi, '')
    .replace(/<\/?ol[^>]*>/gi, '')
    .trim();

  // Track positions of list items to exclude paragraphs inside them
  const listItemRanges: { start: number; end: number }[] = [];
  const liRegex = /<li[^>]*>(.*?)<\/li>/gis;
  let match;

  // First pass: find all list items and their ranges
  while ((match = liRegex.exec(content)) !== null) {
    listItemRanges.push({ start: match.index, end: match.index + match[0].length });
  }

  // Helper to check if position is inside a list item
  const isInsideListItem = (pos: number): boolean => {
    return listItemRanges.some(range => pos >= range.start && pos < range.end);
  };

  // Create a map of positions to blocks for ordering
  const positionedBlocks: { pos: number; block: ContentBlock }[] = [];

  // Find all h1 headers
  const h1Regex = /<h1[^>]*>(.*?)<\/h1>/gis;
  while ((match = h1Regex.exec(content)) !== null) {
    positionedBlocks.push({
      pos: match.index,
      block: { type: 'h1', text: cleanInnerHTML(match[1]) }
    });
  }

  // Find all h2 headers
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gis;
  while ((match = h2Regex.exec(content)) !== null) {
    positionedBlocks.push({
      pos: match.index,
      block: { type: 'h2', text: cleanInnerHTML(match[1]) }
    });
  }

  // Find all paragraphs (but NOT those inside list items)
  const pRegex = /<p[^>]*>(.*?)<\/p>/gis;
  while ((match = pRegex.exec(content)) !== null) {
    // Skip if this paragraph is inside a list item
    if (isInsideListItem(match.index)) continue;

    const text = cleanInnerHTML(match[1]);
    if (text.trim()) {
      positionedBlocks.push({
        pos: match.index,
        block: { type: 'paragraph', text }
      });
    }
  }

  // Find all list items (reset regex)
  const liRegex2 = /<li[^>]*>(.*?)<\/li>/gis;
  while ((match = liRegex2.exec(content)) !== null) {
    const text = cleanInnerHTML(match[1]);
    if (text.trim()) {
      positionedBlocks.push({
        pos: match.index,
        block: { type: 'list-item', text }
      });
    }
  }

  // Sort by position to maintain order
  positionedBlocks.sort((a, b) => a.pos - b.pos);

  // Extract blocks, avoiding duplicates
  const seenTexts = new Set<string>();
  for (const pb of positionedBlocks) {
    const normalizedText = pb.block.text.trim().toLowerCase();
    if (normalizedText && !seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      blocks.push(pb.block);
    }
  }

  // If no HTML structure found, treat as plain text paragraphs
  if (blocks.length === 0) {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const paragraphs = plainText.split(/\n+/).filter(p => p.trim());
    for (const p of paragraphs) {
      blocks.push({ type: 'paragraph', text: p.trim() });
    }
  }

  return blocks;
}

// Clean inner HTML - remove tags but preserve text, handle <strong>
function cleanInnerHTML(html: string): string {
  return html
    // Keep strong/bold text with markers we'll handle later
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    // Remove all other HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove emoji (font doesn't support them)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Get font size and color for block type
function getBlockStyle(type: ContentBlock['type']): {
  fontSize: number;
  color: { r: number; g: number; b: number };
  isBold: boolean;
  marginTop: number;
  marginBottom: number;
} {
  switch (type) {
    case 'h1':
      return {
        fontSize: LAYOUT.fonts.heading,
        color: COLORS.primary,
        isBold: true,
        marginTop: LAYOUT.spacing.paragraph * 1.5,
        marginBottom: LAYOUT.spacing.line,
      };
    case 'h2':
      return {
        fontSize: LAYOUT.fonts.subheading,
        color: COLORS.secondary || COLORS.primary,
        isBold: true,
        marginTop: LAYOUT.spacing.paragraph,
        marginBottom: LAYOUT.spacing.line * 0.5,
      };
    case 'list-item':
      return {
        fontSize: LAYOUT.fonts.body,
        color: COLORS.text.body,
        isBold: false,
        marginTop: 0,
        marginBottom: LAYOUT.spacing.item,
      };
    case 'paragraph':
    default:
      return {
        fontSize: LAYOUT.fonts.body,
        color: COLORS.text.body,
        isBold: false,
        marginTop: 0,
        marginBottom: LAYOUT.spacing.paragraph,
      };
  }
}

// Render a single content block
function renderBlock(
  generator: PDFGenerator,
  page: PDFPage,
  block: ContentBlock,
  x: number,
  y: number,
  isFirstBlock: boolean
): number {
  const style = getBlockStyle(block.type);

  // Add top margin (except for first block)
  if (!isFirstBlock && style.marginTop > 0) {
    y -= style.marginTop;
  }

  // Handle list items with bullet
  if (block.type === 'list-item') {
    // Draw bullet
    generator.drawText(page, '•', x, y, {
      size: style.fontSize,
      color: style.color,
    });

    // Draw text with indent
    const bulletIndent = 15;
    const text = block.text.replace(/\*\*/g, ''); // Remove bold markers for now
    y = generator.drawMultilineText(page, text, x + bulletIndent, y, {
      size: style.fontSize,
      color: style.color,
      maxWidth: LAYOUT.content.width - bulletIndent,
      lineHeight: LAYOUT.lineHeight.normal,
      font: style.isBold ? generator.getBoldFont() : undefined,
    });
  } else {
    // For headers and paragraphs
    const text = block.text.replace(/\*\*/g, ''); // Remove bold markers for now
    const font = style.isBold ? generator.getBoldFont() : undefined;

    y = generator.drawMultilineText(page, text, x, y, {
      size: style.fontSize,
      color: style.color,
      maxWidth: LAYOUT.content.width,
      lineHeight: block.type === 'h1' || block.type === 'h2' ? 1.3 : LAYOUT.lineHeight.normal,
      font,
    });
  }

  // Add bottom margin
  y -= style.marginBottom;

  return y;
}

// Estimate height of a content block
function estimateBlockHeight(
  generator: PDFGenerator,
  block: ContentBlock
): number {
  const style = getBlockStyle(block.type);
  const text = block.text.replace(/\*\*/g, '');

  let width = LAYOUT.content.width;
  if (block.type === 'list-item') {
    width -= 15; // bullet indent
  }

  const textHeight = generator.estimateTextHeight(
    text,
    style.fontSize,
    width,
    block.type === 'h1' || block.type === 'h2' ? 1.3 : LAYOUT.lineHeight.normal
  );

  return textHeight + style.marginTop + style.marginBottom;
}

export function renderAISummary(
  generator: PDFGenerator,
  page: PDFPage,
  data: AISummaryData,
  startY: number,
  minBottomMargin: number = LAYOUT.margin.bottom + LAYOUT.spacing.section
): AISummaryResult {
  const x = LAYOUT.margin.left;
  let y = startY;
  const overflow: ContentBlock[] = [];

  // Section header
  y = generator.drawSectionHeader(page, '2. Opis współpracy i rekomendacje', x, y);
  y -= 10;

  if (!data.content || data.content.trim() === '') {
    generator.drawText(page, 'Brak opisu współpracy.', x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.muted,
    });
    y -= LAYOUT.fonts.body + LAYOUT.spacing.section;
    return { y, overflow: [] };
  }

  // Parse HTML content into blocks
  const blocks = parseHTMLContent(data.content);

  let renderedAtLeastOne = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Estimate height of this block
    const estimatedHeight = estimateBlockHeight(generator, block);

    // Check if we would go below minimum margin
    if (y - estimatedHeight < minBottomMargin && renderedAtLeastOne) {
      // Add remaining blocks to overflow
      for (let j = i; j < blocks.length; j++) {
        overflow.push(blocks[j]);
      }
      break;
    }

    // Render block
    y = renderBlock(generator, page, block, x, y, !renderedAtLeastOne);
    renderedAtLeastOne = true;
  }

  if (overflow.length === 0) {
    y -= LAYOUT.spacing.section - LAYOUT.spacing.paragraph;
  }

  return { y, overflow };
}

// Render overflow content on a new page (continuation)
export function renderAISummaryOverflow(
  generator: PDFGenerator,
  page: PDFPage,
  blocks: ContentBlock[],
  startY: number,
  minBottomMargin: number = LAYOUT.margin.bottom + LAYOUT.spacing.section
): AISummaryResult {
  const x = LAYOUT.margin.left;
  let y = startY;
  const overflow: ContentBlock[] = [];

  // Section continuation header
  y = generator.drawSectionHeader(page, '2. Opis współpracy i rekomendacje (cd.)', x, y);
  y -= 10;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Estimate height of this block
    const estimatedHeight = estimateBlockHeight(generator, block);

    // Check if we would go below minimum margin
    if (y - estimatedHeight < minBottomMargin) {
      // Add remaining blocks to overflow
      for (let j = i; j < blocks.length; j++) {
        overflow.push(blocks[j]);
      }
      break;
    }

    // Render block
    y = renderBlock(generator, page, block, x, y, i === 0);
  }

  if (overflow.length === 0) {
    y -= LAYOUT.spacing.section - LAYOUT.spacing.paragraph;
  }

  return { y, overflow };
}
