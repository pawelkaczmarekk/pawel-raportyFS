import { PDFPage } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface ActionsData {
  actions: string[];
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

  // Section header
  y = generator.drawSectionHeader(page, '1. Podsumowanie wykonanych działań', x, y);
  y -= 10;

  if (data.actions.length === 0) {
    generator.drawText(page, 'Brak zarejestrowanych działań w tym okresie.', x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.muted,
    });
    y -= LAYOUT.fonts.body + LAYOUT.spacing.section;
    return y;
  }

  // Draw bullet list of actions
  y = generator.drawBulletList(page, data.actions, x, y, {
    size: LAYOUT.fonts.body,
    color: COLORS.text.body,
    maxWidth: LAYOUT.content.width - 20,
  });

  y -= LAYOUT.spacing.section;

  return y;
}
