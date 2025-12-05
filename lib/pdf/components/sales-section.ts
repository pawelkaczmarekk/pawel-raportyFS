import { PDFPage, rgb } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface SalesData {
  allegroPl: number;
  allegroCz: number;
  allegreSk: number;
  allegroHu: number;
  suma: number;
  previousMonth?: number;
  previousYear?: number;
}

function formatCurrency(value: number, currency: string = 'PLN'): string {
  if (value === 0) {
    return `0 ${currency}`;
  }
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;
}

export function renderSalesSection(
  generator: PDFGenerator,
  page: PDFPage,
  data: SalesData,
  startY: number
): number {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Section header
  y = generator.drawSectionHeader(page, '3. Wartość sprzedaży', x, y);
  y -= LAYOUT.spacing.paragraph;

  // Sales by country - grid layout
  const colWidth = LAYOUT.content.width / 4;
  const cellHeight = LAYOUT.table.rowHeight * 2;
  const cellPadding = LAYOUT.table.cellPadding;
  const countries = [
    { label: 'Allegro.pl', value: data.allegroPl, currency: 'PLN' },
    { label: 'Allegro.cz', value: data.allegroCz, currency: 'CZK' },
    { label: 'Allegro.sk', value: data.allegreSk, currency: 'EUR' },
    { label: 'Allegro.hu', value: data.allegroHu, currency: 'HUF' },
  ];

  // Draw country boxes
  for (let i = 0; i < countries.length; i++) {
    const country = countries[i];
    const cellX = x + (i * colWidth);

    // Box background
    page.drawRectangle({
      x: cellX,
      y: y - cellHeight,
      width: colWidth - cellPadding / 2,
      height: cellHeight,
      color: rgb(0.98, 0.98, 0.98),
      borderColor: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
      borderWidth: 2,
    });

    // Country label - BarlowCondensed-Regular, uppercase per brand guidelines
    generator.drawText(page, country.label.toUpperCase(), cellX + cellPadding, y - cellPadding - LAYOUT.fonts.small, {
      size: LAYOUT.fonts.small,
      font: generator.getCondensedFont(),
      color: COLORS.text.muted,
    });

    // Value
    const valueText = formatCurrency(country.value, country.currency);
    generator.drawText(page, valueText, cellX + cellPadding, y - cellPadding - LAYOUT.fonts.small - LAYOUT.spacing.line - LAYOUT.fonts.body, {
      size: LAYOUT.fonts.body,
      font: generator.getBoldFont(),
      color: COLORS.text.heading,
    });
  }

  y -= cellHeight + LAYOUT.spacing.line;

  // Total sum - highlighted
  const sumaBoxHeight = LAYOUT.table.headerHeight * 1.5;
  page.drawRectangle({
    x,
    y: y - sumaBoxHeight,
    width: LAYOUT.content.width,
    height: sumaBoxHeight,
    color: rgb(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b),
  });

  // Use BarlowSemiCondensed-Bold for header text
  generator.drawText(page, 'SUMA:', x + cellPadding, y - sumaBoxHeight / 2 - LAYOUT.fonts.subheading / 3, {
    size: LAYOUT.fonts.subheading,
    font: generator.getHeadingFont(),
    color: COLORS.text.white,
  });

  const sumaText = formatCurrency(data.suma, 'PLN');
  const sumaWidth = generator.getBoldFont().widthOfTextAtSize(sumaText, LAYOUT.fonts.heading);
  generator.drawText(page, sumaText, LAYOUT.page.width - LAYOUT.margin.right - sumaWidth - cellPadding, y - sumaBoxHeight / 2 - LAYOUT.fonts.heading / 3, {
    size: LAYOUT.fonts.heading,
    font: generator.getBoldFont(),
    color: COLORS.text.white,
  });

  y -= sumaBoxHeight + LAYOUT.spacing.paragraph;

  // Comparison with previous periods
  if (data.previousMonth !== undefined || data.previousYear !== undefined) {
    generator.drawText(page, 'Porównanie:', x, y, {
      size: LAYOUT.fonts.body,
      font: generator.getBoldFont(),
      color: COLORS.text.body,
    });
    y -= LAYOUT.fonts.body + 8;

    if (data.previousMonth !== undefined) {
      const change = data.suma - data.previousMonth;
      const changePercent = data.previousMonth > 0 ? ((change / data.previousMonth) * 100).toFixed(1) : '0';
      const changeColor = change >= 0 ? COLORS.positive : COLORS.negative;
      const changeSign = change >= 0 ? '+' : '';

      generator.drawText(
        page,
        `- Poprzedni miesiąc: ${formatCurrency(data.previousMonth, 'PLN')} (${changeSign}${changePercent}%)`,
        x,
        y,
        { size: LAYOUT.fonts.body, color: COLORS.text.body }
      );
      y -= LAYOUT.fonts.body + 5;
    }

    if (data.previousYear !== undefined) {
      const changeYoY = data.suma - data.previousYear;
      const changePercentYoY = data.previousYear > 0 ? ((changeYoY / data.previousYear) * 100).toFixed(1) : '0';
      const changeSignYoY = changeYoY >= 0 ? '+' : '';

      generator.drawText(
        page,
        `- Analogiczny okres rok temu: ${formatCurrency(data.previousYear, 'PLN')} (${changeSignYoY}${changePercentYoY}%)`,
        x,
        y,
        { size: LAYOUT.fonts.body, color: COLORS.text.body }
      );
      y -= LAYOUT.fonts.body + 5;
    }
  }

  y -= LAYOUT.spacing.section;

  return y;
}
