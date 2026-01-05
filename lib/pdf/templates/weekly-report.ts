import { Partner, ClickUpTask } from '@/types';
import { PDFGenerator } from '../pdf-generator';
import { LAYOUT, fromTop } from '../utils/layout';
import {
  renderHeader,
  renderActionsSection,
  renderAISummary,
  renderSalesSection,
  renderAdsMetrics,
  renderDynamicsSection,
  parseActions,
} from '../components';
import { sheetsService } from '@/lib/api/sheets';

export interface WeeklyPDFData {
  partner: Partner;
  tasks: ClickUpTask[];
  aiContent: string;
  userInput: {
    wykonaneDzialania: string;
  };
  dateRange: { start: Date; end: Date };
  driveActionsSummary?: string[];
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  return `${start.toLocaleDateString('pl-PL', options)} - ${end.toLocaleDateString('pl-PL', options)}`;
}

function formatCurrentMonth(): string {
  const now = new Date();
  return now.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
}

export async function generateWeeklyPDF(data: WeeklyPDFData): Promise<Buffer> {
  const { partner, tasks, aiContent, userInput, driveActionsSummary } = data;

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

  // Start content area - leave space for logo (20% of page height)
  const topOffset = LAYOUT.page.height * 0.20;
  const startY = fromTop(topOffset);
  let y = startY;

  // === PAGE 1: Header + Actions + AI Summary ===

  // Prepare actions for height calculation
  const userActions = parseActions(userInput.wykonaneDzialania);
  const clickupActions = tasks
    .filter(t => t.status?.status?.toLowerCase().includes('complete') || t.status?.status?.toLowerCase().includes('closed'))
    .map(t => t.name);

  // Include Google Drive actions summary
  const driveActions = driveActionsSummary || [];

  const combinedActions = [...userActions, ...clickupActions, ...driveActions];
  const actionsToRender = combinedActions;

  // Estimate total page 1 content height for dynamic background
  const headerHeight = LAYOUT.fonts.title * 1.5 + LAYOUT.fonts.subheading * 3 + LAYOUT.spacing.section * 2;
  const actionsHeight = LAYOUT.fonts.heading * 1.5 + generator.estimateBulletListHeight(actionsToRender, LAYOUT.fonts.body, LAYOUT.content.width - 20) + LAYOUT.spacing.section;
  const aiSummaryHeight = LAYOUT.fonts.heading * 1.5 + generator.estimateTextHeight(aiContent, LAYOUT.fonts.body, LAYOUT.content.width) + LAYOUT.spacing.section * 2;
  const totalPage1Height = headerHeight + actionsHeight + aiSummaryHeight + LAYOUT.spacing.paragraph * 4;

  // 1. Header - use current month for weekly reports
  y = renderHeader(generator, page1, {
    title: 'RAPORT PROWADZENIA DZIAŁAŃ NA KONCIE',
    subtitle: `Raport Tygodniowy | ${formatDateRange(dateRange.start, dateRange.end)} | Dane: ${formatCurrentMonth()}`,
    partnerName: partner.nazwaKonta,
    dateRange,
    opiekun: partner.opiekun,
  }, y);

  // 2. Actions section
  y = renderActionsSection(generator, page1, {
    actions: actionsToRender,
  }, y);

  // 3. AI Summary (use result object but ignore overflow for weekly - simpler reports)
  const aiResult = renderAISummary(generator, page1, {
    content: aiContent,
  }, y);
  y = aiResult.y;

  // === PAGE 2: Data tables (Sales, ADS, Dynamics) - NO CHART ===

  const page2 = await generator.addPage();
  const page2TopOffset = LAYOUT.page.height * 0.20;
  const page2StartY = fromTop(page2TopOffset);
  y = page2StartY;

  // Estimate page 2 content height (3 sections with metrics grids)
  const salesHeight = LAYOUT.fonts.heading * 1.5 + LAYOUT.table.rowHeight * 4 + LAYOUT.spacing.section * 2;
  const adsHeight = LAYOUT.fonts.heading * 1.5 + LAYOUT.table.rowHeight * 4 + LAYOUT.spacing.section * 2;
  const dynamicsHeight = LAYOUT.fonts.heading * 1.5 + LAYOUT.table.rowHeight * 4 + LAYOUT.spacing.section * 2;
  const totalPage2Height = salesHeight + adsHeight + dynamicsHeight + LAYOUT.spacing.paragraph * 4;

  // Get previous month comparison
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonthSales = await sheetsService.getPartnerSalesForMonth(
    partner.nazwaKonta,
    previousMonthDate
  );

  // 4. Sales section (using CURRENT month data)
  y = renderSalesSection(generator, page2, {
    allegroPl: partner.allegroPl,
    allegroCz: partner.allegroCz,
    allegreSk: partner.allegreSk,
    allegroHu: partner.allegroHu,
    suma: partner.suma,
    previousMonth: previousMonthSales,
  }, y);

  // 5. ADS Metrics
  y = renderAdsMetrics(generator, page2, {
    kosztAds: partner.kosztAds,
    przychodAds: partner.przychodAds,
    zwrotZAds: partner.zwrotZAds,
    oczekiwanyZwrotZAds: partner.oczekiwanyZwrotZAds,
    udzialAdsWPrzychodach: partner.udzialAdsWPrzychodach,
  }, y);

  // 6. Dynamics section
  y = renderDynamicsSection(generator, page2, {
    dynamikaRR: partner.dynamikaRR,
    dynamikaMM: partner.dynamikaMM,
    cel: partner.cel,
    realizacji: partner.realizacji,
    progres: partner.progres,
  }, y);

  // NO CHART for weekly reports - keep it simple

  // Footer contact info
  y -= LAYOUT.spacing.section;
  generator.drawText(page2, `Kontakt: ${partner.opiekunFsEmail}`, LAYOUT.margin.left, y, {
    size: LAYOUT.fonts.small,
  });
  y -= LAYOUT.fonts.small + LAYOUT.spacing.line;
  generator.drawText(page2, 'vSprint | Allegro Ads Partner', LAYOUT.margin.left, y, {
    size: LAYOUT.fonts.small,
  });

  // Generate PDF buffer
  return generator.generate();
}
