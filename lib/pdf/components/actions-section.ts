import { PDFPage, rgb } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface ActionsData {
  actions: string[];
}

export interface NarrativeActionsData {
  osiagniecia: string;
  wyzwania: string;
  plany: string;
}

// Parse action text into list items
// Handles text separated by newlines, semicolons, or already formatted as bullet points
export function parseActions(text: string): string[] {
  if (!text || text.trim() === '') {
    return [];
  }

  // Split by newlines, then by semicolons
  let items = text
    .split(/[\n\r]+/)
    .flatMap(line => line.split(/[;]/))
    .map(item => item.trim())
    .filter(item => item.length > 0);

  // Remove leading bullet characters if present
  items = items.map(item => {
    return item
      .replace(/^[-•*]\s*/, '')
      .replace(/^\d+[.)]\s*/, '')
      .trim();
  });

  return items.filter(item => item.length > 0);
}

export function renderActionsSection(
  generator: PDFGenerator,
  page: PDFPage,
  data: ActionsData,
  startY: number
): number {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Skip entire section if no actions
  if (data.actions.length === 0) {
    return y;
  }

  // Section header
  y = generator.drawSectionHeader(page, '1. Podsumowanie wykonanych działań', x, y);
  y -= LAYOUT.spacing.paragraph;

  // Draw bullet list of actions
  y = generator.drawBulletList(page, data.actions, x, y, {
    size: LAYOUT.fonts.body,
    color: COLORS.text.body,
    maxWidth: LAYOUT.content.width - 8,
  });

  y -= LAYOUT.spacing.section;

  return y;
}

// Draw a subsection label (e.g., "OSIĄGNIĘCIA") using condensed font
function drawSubsectionLabel(
  generator: PDFGenerator,
  page: PDFPage,
  label: string,
  x: number,
  y: number
): number {
  const font = generator.getCondensedFont();
  const size = LAYOUT.fonts.body;

  page.drawText(label.toUpperCase(), {
    x,
    y,
    size,
    font,
    color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
  });

  return y - size - LAYOUT.spacing.line;
}

// Render narrative (descriptive) actions section for monthly reports
// Instead of bullet points, renders continuous paragraphs for each category
export function renderNarrativeActionsSection(
  generator: PDFGenerator,
  page: PDFPage,
  data: NarrativeActionsData,
  startY: number
): number {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Skip entire section if all fields are empty
  const hasContent =
    (data.osiagniecia && data.osiagniecia.trim()) ||
    (data.wyzwania && data.wyzwania.trim()) ||
    (data.plany && data.plany.trim());

  if (!hasContent) {
    return y;
  }

  // Section header
  y = generator.drawSectionHeader(page, '1. Podsumowanie wykonanych działań', x, y);
  y -= LAYOUT.spacing.paragraph;

  // Osiągnięcia subsection
  if (data.osiagniecia && data.osiagniecia.trim()) {
    y = drawSubsectionLabel(generator, page, 'Osiągnięcia', x, y);
    y = generator.drawMultilineText(page, data.osiagniecia.trim(), x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.body,
      maxWidth: LAYOUT.content.width,
      lineHeight: LAYOUT.lineHeight.normal,
    });
    y -= LAYOUT.spacing.paragraph;
  }

  // Wyzwania subsection
  if (data.wyzwania && data.wyzwania.trim()) {
    y = drawSubsectionLabel(generator, page, 'Wyzwania', x, y);
    y = generator.drawMultilineText(page, data.wyzwania.trim(), x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.body,
      maxWidth: LAYOUT.content.width,
      lineHeight: LAYOUT.lineHeight.normal,
    });
    y -= LAYOUT.spacing.paragraph;
  }

  // Plany na przyszłość subsection
  if (data.plany && data.plany.trim()) {
    y = drawSubsectionLabel(generator, page, 'Plany na przyszłość', x, y);
    y = generator.drawMultilineText(page, data.plany.trim(), x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.body,
      maxWidth: LAYOUT.content.width,
      lineHeight: LAYOUT.lineHeight.normal,
    });
    y -= LAYOUT.spacing.paragraph;
  }

  y -= LAYOUT.spacing.section - LAYOUT.spacing.paragraph;

  return y;
}
