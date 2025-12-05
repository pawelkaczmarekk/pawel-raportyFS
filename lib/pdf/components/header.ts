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

  // Title - RAPORT PROWADZENIA DZIAŁAŃ NA KONCIE (BarlowSemiCondensed-Bold, uppercase)
  const titleFontSize = LAYOUT.fonts.title;
  const titleFont = generator.getHeadingFont(); // BarlowSemiCondensed-Bold for headings
  const titleMaxWidth = LAYOUT.content.width;
  const uppercaseTitle = data.title.toUpperCase();

  // Check if title fits in one line
  const titleWidth = titleFont.widthOfTextAtSize(uppercaseTitle, titleFontSize);

  if (titleWidth > titleMaxWidth) {
    // Use multiline text for long titles
    y = generator.drawMultilineText(page, uppercaseTitle, x, y, {
      size: titleFontSize,
      font: titleFont,
      color: COLORS.text.heading,
      maxWidth: titleMaxWidth,
      lineHeight: 1.2,
    });
    y -= 10;
  } else {
    generator.drawText(page, uppercaseTitle, x, y, {
      size: titleFontSize,
      font: titleFont,
      color: COLORS.text.heading,
    });
    y -= titleFontSize + 10;
  }

  // Subtitle (e.g., "Raport Miesięczny | Listopad 2024") - BarlowCondensed-Regular, uppercase
  const uppercaseSubtitle = data.subtitle.toUpperCase();
  generator.drawText(page, uppercaseSubtitle, x, y, {
    size: LAYOUT.fonts.subheading,
    font: generator.getCondensedFont(), // BarlowCondensed-Regular for labels/intros
    color: COLORS.text.muted,
  });
  y -= LAYOUT.fonts.subheading + 20;

  // Partner Name - BarlowSemiCondensed-Bold, uppercase
  generator.drawText(page, data.partnerName.toUpperCase(), x, y, {
    size: LAYOUT.fonts.heading,
    font: generator.getHeadingFont(), // BarlowSemiCondensed-Bold for headings
    color: COLORS.primary,
  });
  y -= LAYOUT.fonts.heading + 10;

  // Date range - BarlowCondensed-Regular, uppercase
  const dateRangeStr = formatDateRange(data.dateRange.start, data.dateRange.end);
  generator.drawText(page, `OKRES: ${dateRangeStr.toUpperCase()}`, x, y, {
    size: LAYOUT.fonts.small,
    font: generator.getCondensedFont(), // BarlowCondensed-Regular for labels
    color: COLORS.text.muted,
  });
  y -= LAYOUT.fonts.small + 5;

  // Opiekun info - BarlowCondensed-Regular, uppercase
  if (data.opiekun) {
    generator.drawText(page, `OPIEKUN: ${data.opiekun.toUpperCase()}`, x, y, {
      size: LAYOUT.fonts.small,
      font: generator.getCondensedFont(), // BarlowCondensed-Regular for labels
      color: COLORS.text.muted,
    });
    y -= LAYOUT.fonts.small;
  }

  y -= LAYOUT.spacing.section;

  return y;
}
