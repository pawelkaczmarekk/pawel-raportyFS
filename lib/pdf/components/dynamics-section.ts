import { PDFPage, rgb } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface DynamicsData {
  dynamikaRR: string;
  dynamikaMM: string;
  cel: number;
  realizacji: number;
  progres: string;
  celNaMiesiac?: number;  // New goal for upcoming month
}

function formatCurrency(value: number): string {
  if (value === 0) return '0 PLN';
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PLN`;
}

function formatPercent(value: number): string {
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function renderDynamicsSection(
  generator: PDFGenerator,
  page: PDFPage,
  data: DynamicsData,
  startY: number
): number {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Section header
  y = generator.drawSectionHeader(page, '4. Dynamika i realizacja celów', x, y);
  y -= LAYOUT.spacing.paragraph;

  // Metrics grid - 4 columns for dynamics data
  const metrics = [
    { label: 'Dynamika R/R', value: data.dynamikaRR || '-' },
    { label: 'Dynamika M/M', value: data.dynamikaMM || '-' },
    { label: 'Cel (raport)', value: formatCurrency(data.cel) },
    { label: 'Realizacja', value: formatPercent(data.realizacji) },
  ];

  y = generator.drawMetricsGrid(page, metrics, x, y, 4);

  // Progress indicator if available
  if (data.progres && data.progres !== '-') {
    y -= LAYOUT.spacing.line;
    generator.drawText(page, `Progres: ${data.progres}`, x, y, {
      size: LAYOUT.fonts.body,
      color: COLORS.text.body,
    });
    y -= LAYOUT.fonts.body;
  }

  // New month goal as separate highlighted section
  if (data.celNaMiesiac && data.celNaMiesiac > 0) {
    y -= LAYOUT.spacing.paragraph;

    // Draw highlighted box for new month goal
    const boxHeight = LAYOUT.fonts.heading * 2 + LAYOUT.spacing.paragraph;
    const boxY = y - boxHeight;

    page.drawRectangle({
      x: x,
      y: boxY,
      width: LAYOUT.content.width,
      height: boxHeight,
      color: rgb(1, 0.95, 0.9), // Light orange background
      borderColor: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
      borderWidth: 2,
    });

    // Goal label and value - BarlowCondensed-Regular for labels, uppercase
    generator.drawText(page, 'CEL NA NOWY MIESIĄC:', x + LAYOUT.spacing.paragraph, y - LAYOUT.spacing.line - LAYOUT.fonts.body, {
      size: LAYOUT.fonts.body,
      font: generator.getCondensedFont(),
      color: COLORS.text.muted,
    });

    generator.drawText(page, formatCurrency(data.celNaMiesiac), x + LAYOUT.spacing.paragraph, y - LAYOUT.spacing.line - LAYOUT.fonts.body - LAYOUT.fonts.heading, {
      size: LAYOUT.fonts.heading,
      font: generator.getBoldFont(),
      color: COLORS.primary,
    });

    y = boxY;
  }

  y -= LAYOUT.spacing.section;

  return y;
}
