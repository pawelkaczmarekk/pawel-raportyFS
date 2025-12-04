import { PDFPage } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface AISummaryData {
  content: string;
}

export interface AISummaryResult {
  y: number;
  overflow: string[];  // Paragraphs that didn't fit
}

// Clean content from HTML and markdown
function cleanAIContent(content: string): string {
  return content
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')  // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with space
    .replace(/&amp;/g, '&')   // Replace &amp; with &
    .replace(/&lt;/g, '<')    // Replace &lt; with <
    .replace(/&gt;/g, '>')    // Replace &gt; with >
    .replace(/&quot;/g, '"')  // Replace &quot; with "
    // Remove markdown formatting
    .replace(/\*\*/g, '')  // Remove bold markers
    .replace(/\*/g, '')    // Remove italic markers
    .replace(/#{1,6}\s/g, '') // Remove headers
    .trim();
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
  const overflow: string[] = [];

  // Section header - ALWAYS draw this on current page
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

  const cleanContent = cleanAIContent(data.content);

  // Split into paragraphs - also handle single newlines as paragraph breaks
  const paragraphs = cleanContent.split(/\n+/).filter(p => p.trim());

  let renderedAtLeastOne = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue;

    // Estimate height of this paragraph
    const estimatedHeight = generator.estimateTextHeight(
      paragraph,
      LAYOUT.fonts.body,
      LAYOUT.content.width,
      LAYOUT.lineHeight.normal
    ) + LAYOUT.spacing.paragraph;

    // Check if we would go below minimum margin
    // BUT: always render at least the first paragraph to avoid empty sections
    if (y - estimatedHeight < minBottomMargin && renderedAtLeastOne) {
      // Add remaining paragraphs to overflow
      for (let j = i; j < paragraphs.length; j++) {
        if (paragraphs[j].trim()) {
          overflow.push(paragraphs[j].trim());
        }
      }
      break;
    }

    // Draw paragraph
    y = generator.drawMultilineText(page, paragraph, x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.body,
      maxWidth: LAYOUT.content.width,
      lineHeight: LAYOUT.lineHeight.normal,
    });
    y -= LAYOUT.spacing.paragraph;
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
  paragraphs: string[],
  startY: number,
  minBottomMargin: number = LAYOUT.margin.bottom + LAYOUT.spacing.section
): AISummaryResult {
  const x = LAYOUT.margin.left;
  let y = startY;
  const overflow: string[] = [];

  // Section continuation header
  y = generator.drawSectionHeader(page, '2. Opis współpracy i rekomendacje (cd.)', x, y);
  y -= 10;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    // Estimate height of this paragraph
    const estimatedHeight = generator.estimateTextHeight(
      paragraph,
      LAYOUT.fonts.body,
      LAYOUT.content.width,
      LAYOUT.lineHeight.normal
    ) + LAYOUT.spacing.paragraph;

    // Check if we would go below minimum margin
    if (y - estimatedHeight < minBottomMargin) {
      // Add remaining paragraphs to overflow
      for (let j = i; j < paragraphs.length; j++) {
        overflow.push(paragraphs[j]);
      }
      break;
    }

    // Draw paragraph
    y = generator.drawMultilineText(page, paragraph, x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.body,
      maxWidth: LAYOUT.content.width,
      lineHeight: LAYOUT.lineHeight.normal,
    });
    y -= LAYOUT.spacing.paragraph;
  }

  if (overflow.length === 0) {
    y -= LAYOUT.spacing.section - LAYOUT.spacing.paragraph;
  }

  return { y, overflow };
}
