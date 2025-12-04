import { Partner, ClickUpTask } from '@/types';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT, fromTop } from '../utils/layout';
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
  celMiesieczny?: number;  // New month goal set by user
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

export async function generateMonthlyPDF(data: MonthlyPDFData): Promise<Buffer> {
  const { partner, tasks, aiContent, userInput, celMiesieczny } = data;

  // Ensure dateRange contains Date objects (may come as strings from JSON)
  const dateRange = {
    start: data.dateRange.start instanceof Date ? data.dateRange.start : new Date(data.dateRange.start),
    end: data.dateRange.end instanceof Date ? data.dateRange.end : new Date(data.dateRange.end),
  };

  // Initialize PDF generator with template background
  const generator = new PDFGenerator();
  await generator.initialize();

  // Get first page (template with background)
  const page1 = generator.getFirstPage();

  // Start content area - leave space for logo at top (20% of page height)
  const topOffset = LAYOUT.page.height * 0.20;
  const startY = fromTop(topOffset);
  let y = startY;

  // === PAGE 1: Header + Actions + AI Summary ===
  // Pre-calculate content heights for dynamic background

  // Prepare actions
  const allActions = [
    ...parseActions(userInput.osiagniecia),
    ...parseActions(userInput.wyzwania),
    ...parseActions(userInput.plany),
  ];

  const clickupActions = tasks
    .filter(t => t.status?.status?.toLowerCase().includes('complete') || t.status?.status?.toLowerCase().includes('closed'))
    .map(t => t.name);

  const combinedActions = [...allActions, ...clickupActions];
  const actionsToRender = combinedActions.length > 0 ? combinedActions : ['Brak zarejestrowanych dzialan w tym okresie'];

  // Estimate total page 1 content height
  const headerHeight = LAYOUT.fonts.title * 1.5 + LAYOUT.fonts.subheading * 3 + LAYOUT.spacing.section * 2;
  const actionsHeight = LAYOUT.fonts.heading * 1.5 + generator.estimateBulletListHeight(actionsToRender, LAYOUT.fonts.body, LAYOUT.content.width - 20) + LAYOUT.spacing.section;
  const aiSummaryHeight = LAYOUT.fonts.heading * 1.5 + generator.estimateTextHeight(aiContent, LAYOUT.fonts.body, LAYOUT.content.width) + LAYOUT.spacing.section * 2;

  const totalPage1Height = headerHeight + actionsHeight + aiSummaryHeight + LAYOUT.spacing.paragraph * 4;

  // Draw dynamic background FIRST (before content)
  generator.drawContentBackground(page1, startY + LAYOUT.spacing.section, totalPage1Height, 0.92);

  // 1. Header
  y = renderHeader(generator, page1, {
    title: 'RAPORT PROWADZENIA DZIALAN NA KONCIE',
    subtitle: `Raport Miesieczny | ${formatMonthYear(dateRange.start)}`,
    partnerName: partner.nazwaKonta,
    dateRange,
    opiekun: partner.opiekun,
  }, y);

  // 2. Actions section
  y = renderActionsSection(generator, page1, {
    actions: actionsToRender,
  }, y);

  // 3. AI Summary with overflow handling
  const minBottomMargin = LAYOUT.margin.bottom + LAYOUT.spacing.section * 2;
  const aiResult = renderAISummary(generator, page1, {
    content: aiContent,
  }, y, minBottomMargin);
  y = aiResult.y;

  // Handle AI content overflow - create page 1B if needed
  let overflowParagraphs = aiResult.overflow;
  let currentOverflowPage = page1;
  let overflowPageCount = 0;

  while (overflowParagraphs.length > 0 && overflowPageCount < 3) {
    // Create new page for overflow content
    const overflowPage = await generator.addPage();
    const overflowTopOffset = LAYOUT.page.height * 0.20;
    const overflowStartY = fromTop(overflowTopOffset);

    // Calculate overflow content height
    let overflowContentHeight = LAYOUT.fonts.heading * 1.5 + LAYOUT.spacing.section;
    for (const para of overflowParagraphs) {
      overflowContentHeight += generator.estimateTextHeight(para, LAYOUT.fonts.body, LAYOUT.content.width, LAYOUT.lineHeight.normal);
      overflowContentHeight += LAYOUT.spacing.paragraph;
    }
    overflowContentHeight = Math.min(overflowContentHeight, LAYOUT.page.height * 0.75);

    // Draw background for overflow page
    generator.drawContentBackground(overflowPage, overflowStartY + LAYOUT.spacing.section, overflowContentHeight, 0.92);

    // Render overflow content
    const overflowResult = renderAISummaryOverflow(
      generator,
      overflowPage,
      overflowParagraphs,
      overflowStartY,
      minBottomMargin
    );

    overflowParagraphs = overflowResult.overflow;
    currentOverflowPage = overflowPage;
    overflowPageCount++;
    console.log(`[MonthlyPDF] Created overflow page ${overflowPageCount}, remaining paragraphs: ${overflowParagraphs.length}`);
  }

  // === PAGE 2: Data tables (Sales, ADS, Dynamics) ===
  // Always create page 2 for data sections
  const page2 = await generator.addPage();
  const page2TopOffset = LAYOUT.page.height * 0.20;
  const page2StartY = fromTop(page2TopOffset);
  y = page2StartY;

  // Draw semi-transparent white background for Page 2
  const page2ContentHeight = LAYOUT.page.height * 0.78;  // Leave space at bottom
  generator.drawContentBackground(page2, page2StartY + LAYOUT.spacing.section, page2ContentHeight, 0.92);

  // Fetch historical data for chart
  const historicalData = await sheetsService.getStatystykiData(partner.nazwaKonta, 5);
  console.log(`[MonthlyPDF] Historical data fetched: ${historicalData.length} entries`);
  if (historicalData.length > 0) {
    console.log(`[MonthlyPDF] Sample data:`, historicalData.slice(0, 3));
  }

  // Get comparison data
  const previousMonthDate = new Date(dateRange.start);
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthSales = await sheetsService.getPartnerSalesForMonth(
    partner.nazwaKonta,
    previousMonthDate
  );

  const previousYearDate = new Date(dateRange.start);
  previousYearDate.setFullYear(previousYearDate.getFullYear() - 1);
  const previousYearSales = await sheetsService.getPartnerSalesForMonth(
    partner.nazwaKonta,
    previousYearDate
  );

  // 4. Sales section
  y = renderSalesSection(generator, page2, {
    allegroPl: partner.allegroPl,
    allegroCz: partner.allegroCz,
    allegreSk: partner.allegreSk,
    allegroHu: partner.allegroHu,
    suma: partner.suma,
    previousMonth: previousMonthSales,
    previousYear: previousYearSales,
  }, y);

  // 5. ADS Metrics
  y = renderAdsMetrics(generator, page2, {
    kosztAds: partner.kosztAds,
    przychodAds: partner.przychodAds,
    zwrotZAds: partner.zwrotZAds,
    oczekiwanyZwrotZAds: partner.oczekiwanyZwrotZAds,
    zgodnosc: partner.zgodnosc,
    udzialAdsWPrzychodach: partner.udzialAdsWPrzychodach,
  }, y);

  // 6. Dynamics section
  y = renderDynamicsSection(generator, page2, {
    dynamikaRR: partner.dynamikaRR,
    dynamikaMM: partner.dynamikaMM,
    cel: partner.cel,
    realizacji: partner.realizacji,
    progres: partner.progres,
    celNaMiesiac: celMiesieczny,  // Pass user-provided goal for new month
  }, y);

  // === PAGE 3: Historical chart (larger, more readable) ===
  if (historicalData.length > 0) {
    const page3 = await generator.addPage();
    const page3TopOffset = LAYOUT.page.height * 0.20;  // Same as other pages
    const page3StartY = fromTop(page3TopOffset);
    y = page3StartY;

    // Draw semi-transparent white background for Page 3
    const page3ContentHeight = LAYOUT.page.height * 0.75;
    generator.drawContentBackground(page3, page3StartY + LAYOUT.spacing.section, page3ContentHeight, 0.92);

    // 7. Historical chart (full page width for better readability)
    console.log(`[MonthlyPDF] Rendering chart on page 3 at y position: ${y}`);
    y = await renderChartSection(generator, page3, {
      months: historicalData.map(d => d.month),
      sales: historicalData.map(d => d.sales),
    }, y);

    // Footer contact info on page 3
    y -= LAYOUT.spacing.section;
    generator.drawText(page3, `Kontakt: ${partner.opiekunFsEmail}`, LAYOUT.margin.left, y, {
      size: LAYOUT.fonts.small,
    });
    y -= LAYOUT.fonts.small + LAYOUT.spacing.line;
    generator.drawText(page3, 'vSprint | Allegro Ads Partner', LAYOUT.margin.left, y, {
      size: LAYOUT.fonts.small,
    });
  } else {
    console.log(`[MonthlyPDF] No historical data available for chart`);
    // Footer contact info on page 2 if no chart
    y -= LAYOUT.spacing.section;
    generator.drawText(page2, `Kontakt: ${partner.opiekunFsEmail}`, LAYOUT.margin.left, y, {
      size: LAYOUT.fonts.small,
    });
    y -= LAYOUT.fonts.small + LAYOUT.spacing.line;
    generator.drawText(page2, 'vSprint | Allegro Ads Partner', LAYOUT.margin.left, y, {
      size: LAYOUT.fonts.small,
    });
  }

  // Generate PDF buffer
  return generator.generate();
}
