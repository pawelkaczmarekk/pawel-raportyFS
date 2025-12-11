import { PDFPage, rgb } from 'pdf-lib';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT } from '../utils/layout';
import { COLORS } from '../utils/colors';

export interface AdsMetricsData {
  kosztAds: number;
  przychodAds: number;
  zwrotZAds: number;
  oczekiwanyZwrotZAds: number;
  udzialAdsWPrzychodach: string;
}

function formatCurrency(value: number): string {
  if (value === 0) return '0 PLN';
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PLN`;
}

function formatROI(value: number): string {
  if (value === 0) return '0x';
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

export function renderAdsMetrics(
  generator: PDFGenerator,
  page: PDFPage,
  data: AdsMetricsData,
  startY: number
): number {
  const x = LAYOUT.margin.left;
  let y = startY;

  // Section header
  y = generator.drawSectionHeader(page, '4. Metryki Allegro ADS', x, y);
  y -= LAYOUT.spacing.paragraph;

  // Metrics grid - 2 rows x 3 columns (5 metrics total)
  const metrics = [
    // Row 1
    { label: 'Koszt ADS', value: formatCurrency(data.kosztAds) },
    { label: 'Przychód ADS', value: formatCurrency(data.przychodAds) },
    { label: 'Zwrot z ADS', value: formatROI(data.zwrotZAds) },
    // Row 2
    { label: 'Oczekiwany zwrot', value: formatROI(data.oczekiwanyZwrotZAds) },
    { label: 'Udział ADS', value: data.udzialAdsWPrzychodach || '-' },
  ];

  y = generator.drawMetricsGrid(page, metrics, x, y, 3);

  y -= LAYOUT.spacing.section;

  return y;
}
