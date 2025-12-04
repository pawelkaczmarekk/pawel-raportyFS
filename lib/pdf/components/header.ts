import { PDFPage, rgb } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT, fromTop } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface HeaderData {
  title: string;
  subtitle: string;
  partnerName: string;
  dateRange: { start: Date; end: Date };
  opiekun?: string;
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return `${start.toLocaleDateString('pl-PL', options)} - ${end.toLocaleDateString('pl-PL', options)}`;
}

export function renderHeader(
  generator: PDFGenerator,
  page: PDFPage,
  data: HeaderData,
  startY: number
): number {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Title - RAPORT PROWADZENIA DZIAŁAŃ NA KONCIE (with word wrap if needed)
  const titleFontSize = LAYOUT.fonts.title;
  const titleFont = generator.getBoldFont();
  const titleMaxWidth = LAYOUT.content.width;

  // Check if title fits in one line
  const titleWidth = titleFont.widthOfTextAtSize(data.title, titleFontSize);

  if (titleWidth > titleMaxWidth) {
    // Use multiline text for long titles
    y = generator.drawMultilineText(page, data.title, x, y, {
      size: titleFontSize,
      font: titleFont,
      color: COLORS.text.heading,
      maxWidth: titleMaxWidth,
      lineHeight: 1.2,
    });
    y -= 10;
  } else {
    generator.drawText(page, data.title, x, y, {
      size: titleFontSize,
      font: titleFont,
      color: COLORS.text.heading,
    });
    y -= titleFontSize + 10;
  }

  // Subtitle (e.g., "Raport Miesięczny | Listopad 2024")
  generator.drawText(page, data.subtitle, x, y, {
    size: LAYOUT.fonts.subheading,
    color: COLORS.text.muted,
  });
  y -= LAYOUT.fonts.subheading + 20;

  // Greeting - Dzień dobry [Partner Name]
  generator.drawText(page, `Dzień dobry`, x, y, {
    size: LAYOUT.fonts.body,
    color: COLORS.text.body,
  });
  y -= LAYOUT.fonts.body + 5;

  generator.drawText(page, data.partnerName, x, y, {
    size: LAYOUT.fonts.heading,
    font: generator.getBoldFont(),
    color: COLORS.primary,
  });
  y -= LAYOUT.fonts.heading + 10;

  // Date range
  const dateRangeStr = formatDateRange(data.dateRange.start, data.dateRange.end);
  generator.drawText(page, `Okres: ${dateRangeStr}`, x, y, {
    size: LAYOUT.fonts.small,
    color: COLORS.text.muted,
  });
  y -= LAYOUT.fonts.small + 5;

  // Opiekun info
  if (data.opiekun) {
    generator.drawText(page, `Opiekun: ${data.opiekun}`, x, y, {
      size: LAYOUT.fonts.small,
      color: COLORS.text.muted,
    });
    y -= LAYOUT.fonts.small;
  }

  y -= LAYOUT.spacing.section;

  return y;
}
