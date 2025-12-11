import { Partner, ClickUpTask } from '@/types';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT, fromTop } from '../utils/layout';
import { PDFPage } from 'pdf-lib';
import {
  renderHeader,
  renderActionsSection,
  renderAISummary,
  renderAISummaryOverflow,
  renderSalesSection,
  renderAdsMetrics,
  renderDynamicsSection,
  renderChartSection,
  parseActions,
} from '../components';
import { sheetsService } from '@/lib/api/sheets';

export interface MonthlyPDFData {
  partner: Partner;
  tasks: ClickUpTask[];
  aiContent: string;
  userInput: {
    osiagniecia: string;
    wyzwania: string;
    plany: string;
  };
  dateRange: { start: Date; end: Date };
  celMiesieczny?: number;
  driveActionsSummary?: string[];
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

// Helper to check if we need a new page
function needsNewPage(currentY: number, requiredHeight: number): boolean {
  const minY = LAYOUT.margin.bottom + LAYOUT.spacing.section;
  return currentY - requiredHeight < minY;
}

export async function generateMonthlyPDF(data: MonthlyPDFData): Promise<Buffer> {
  const { partner, tasks, aiContent, userInput, celMiesieczny, driveActionsSummary } = data;

  const dateRange = {
    start: data.dateRange.start instanceof Date ? data.dateRange.start : new Date(data.dateRange.start),
    end: data.dateRange.end instanceof Date ? data.dateRange.end : new Date(data.dateRange.end),
  };

  const generator = new PDFGenerator();
  await generator.initialize();

  // Get first page
  let currentPage = generator.getFirstPage();
  const topOffset = LAYOUT.page.height * 0.20;
  const startY = fromTop(topOffset);
  let y = startY;

  // Prepare actions
  const allActions = [
    ...parseActions(userInput.osiagniecia),
    ...parseActions(userInput.wyzwania),
    ...parseActions(userInput.plany),
  ];

  const clickupActions = tasks
    .filter(t => t.status?.status?.toLowerCase().includes('complete') || t.status?.status?.toLowerCase().includes('closed'))
    .map(t => t.name);

  // Include Google Drive actions summary
  const driveActions = driveActionsSummary || [];

  const combinedActions = [...allActions, ...clickupActions, ...driveActions];
  const actionsToRender = combinedActions.length > 0 ? combinedActions : ['Brak zarejestrowanych działań w tym okresie'];

  // Estimate page 1 content height for background
  const headerHeight = LAYOUT.fonts.title * 1.5 + LAYOUT.fonts.subheading * 3 + LAYOUT.spacing.section * 2;
  const actionsHeight = LAYOUT.fonts.heading * 1.5 + generator.estimateBulletListHeight(actionsToRender, LAYOUT.fonts.body, LAYOUT.content.width - 20) + LAYOUT.spacing.section;
  const aiSummaryHeight = LAYOUT.fonts.heading * 1.5 + generator.estimateTextHeight(aiContent, LAYOUT.fonts.body, LAYOUT.content.width) + LAYOUT.spacing.section * 2;
  const totalPage1Height = headerHeight + actionsHeight + aiSummaryHeight + LAYOUT.spacing.paragraph * 4;

  // 1. Header
  y = renderHeader(generator, currentPage, {
    title: 'RAPORT PROWADZENIA DZIAŁAŃ NA KONCIE',
    subtitle: `Raport Miesięczny | ${formatMonthYear(dateRange.start)}`,
    partnerName: partner.nazwaKonta,
    dateRange,
    opiekun: partner.opiekun,
  }, y);

  // 2. Actions section
  y = renderActionsSection(generator, currentPage, {
    actions: actionsToRender,
  }, y);

  // 3. AI Summary with overflow handling
  const minBottomMargin = LAYOUT.margin.bottom + LAYOUT.spacing.section;
  const aiResult = renderAISummary(generator, currentPage, {
    content: aiContent,
  }, y, minBottomMargin);
  y = aiResult.y;

  // Handle AI content overflow
  let overflowBlocks = aiResult.overflow;
  while (overflowBlocks.length > 0) {
    currentPage = await generator.addPage();
    const overflowStartY = fromTop(topOffset);

    const overflowResult = renderAISummaryOverflow(
      generator,
      currentPage,
      overflowBlocks,
      overflowStartY,
      minBottomMargin
    );

    y = overflowResult.y;
    overflowBlocks = overflowResult.overflow;
  }

  // Fetch data for remaining sections
  const historicalData = await sheetsService.getStatystykiData(partner.nazwaKonta, 12);
  console.log(`[MonthlyPDF] Historical data fetched: ${historicalData.length} entries`);

  const previousMonthDate = new Date(dateRange.start);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthSales = await sheetsService.getPartnerSalesForMonth(partner.nazwaKonta, previousMonthDate);

  const previousYearDate = new Date(dateRange.start);
  previousYearDate.setFullYear(previousYearDate.getFullYear() - 1);
  const previousYearSales = await sheetsService.getPartnerSalesForMonth(partner.nazwaKonta, previousYearDate);

  // Estimate heights for remaining sections
  const salesSectionHeight = 180;
  const adsSectionHeight = 140;
  const dynamicsSectionHeight = 160;
  const chartSectionHeight = LAYOUT.chart.height + 80;

  // Check if we need a new page for Sales section
  if (needsNewPage(y, salesSectionHeight)) {
    currentPage = await generator.addPage();
    y = fromTop(topOffset);
  }

  // 4. Sales section
  y = renderSalesSection(generator, currentPage, {
    allegroPl: partner.allegroPl,
    allegroCz: partner.allegroCz,
    allegreSk: partner.allegreSk,
    allegroHu: partner.allegroHu,
    suma: partner.suma,
    previousMonth: previousMonthSales,
    previousYear: previousYearSales,
  }, y);

  // Check if we need a new page for ADS section
  if (needsNewPage(y, adsSectionHeight)) {
    currentPage = await generator.addPage();
    y = fromTop(topOffset);
  }

  // 5. ADS Metrics
  y = renderAdsMetrics(generator, currentPage, {
    kosztAds: partner.kosztAds,
    przychodAds: partner.przychodAds,
    zwrotZAds: partner.zwrotZAds,
    oczekiwanyZwrotZAds: partner.oczekiwanyZwrotZAds,
    udzialAdsWPrzychodach: partner.udzialAdsWPrzychodach,
  }, y);

  // Check if we need a new page for Dynamics section
  if (needsNewPage(y, dynamicsSectionHeight)) {
    currentPage = await generator.addPage();
    y = fromTop(topOffset);
  }

  // 6. Dynamics section
  y = renderDynamicsSection(generator, currentPage, {
    dynamikaRR: partner.dynamikaRR,
    dynamikaMM: partner.dynamikaMM,
    cel: partner.cel,
    realizacji: partner.realizacji,
    progres: partner.progres,
    celNaMiesiac: celMiesieczny,
  }, y);

  // 7. Historical chart
  if (historicalData.length > 0) {
    // Chart always needs new page due to its size
    if (needsNewPage(y, chartSectionHeight)) {
      currentPage = await generator.addPage();
      y = fromTop(topOffset);
    }

    console.log(`[MonthlyPDF] Rendering chart at y position: ${y}`);
    y = await renderChartSection(generator, currentPage, {
      months: historicalData.map(d => d.month),
      sales: historicalData.map(d => d.sales),
    }, y);
  }

  // Footer
  y -= LAYOUT.spacing.section;
  generator.drawText(currentPage, `Kontakt: ${partner.opiekunFsEmail}`, LAYOUT.margin.left, y, {
    size: LAYOUT.fonts.small,
  });
  y -= LAYOUT.fonts.small + LAYOUT.spacing.line;
  generator.drawText(currentPage, 'vSprint | Allegro Ads Partner', LAYOUT.margin.left, y, {
    size: LAYOUT.fonts.small,
  });

  return generator.generate();
}
