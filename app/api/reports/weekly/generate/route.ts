import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { clickupService } from '@/lib/api/clickup';
import { geminiService } from '@/lib/api/gemini';
import { googleDriveService } from '@/lib/api/google-drive';
import { generateWeeklyReportEmail } from '@/lib/templates/email';
import { getLast7DaysRange, getDayName, getLastNDays } from '@/lib/utils/dates';
import { chartGenerator } from '@/lib/utils/chart-generator';
import { WeeklySalesData, EnhancedWeeklyReportData, HistoryChange, TopChange } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { partnerName, wykonaneDzialania } = body;

    // Get date range
    const dateRange = getLast7DaysRange();

    // Always use CURRENT month data for weekly reports (not based on dateRange.start)
    const currentMonth = new Date();
    const sheetName = sheetsService.getSheetNameForDate(currentMonth);

    // Fetch partner data from the CURRENT month's sheet
    const partner = await sheetsService.getPartnerByName(partnerName, sheetName);
    console.log(`[WeeklyReport-Generate] Using current month sheet: ${sheetName}`);
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Fetch ClickUp tasks
    const tasks = await clickupService.getTasksByPartner(
      partnerName,
      dateRange.start,
      dateRange.end
    );

    console.log(`[WeeklyReport-Generate] Fetched ${tasks.length} ClickUp tasks for ${partnerName}`);

    // Fetch history changes from Google Drive
    const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    let historiaZmian: HistoryChange[] = [];
    let topZmiany: TopChange[] = [];

    if (driveFolderId) {
      try {
        historiaZmian = await googleDriveService.getHistoryChanges(
          driveFolderId,
          partnerName,
          dateRange.start,
          dateRange.end
        );
        topZmiany = googleDriveService.getTopChanges(historiaZmian, 5);
        console.log(`[WeeklyReport-Generate] Fetched ${historiaZmian.length} history changes, ${topZmiany.length} top changes`);
      } catch (error) {
        console.warn('[WeeklyReport-Generate] Failed to fetch history changes from Drive:', error);
      }
    } else {
      console.warn('[WeeklyReport-Generate] GOOGLE_DRIVE_FOLDER_ID not configured, skipping history changes');
    }

    // Generate sales data for last 7 days
    const last7Days = getLastNDays(7);
    const currentDayOfMonth = new Date().getDate();
    const avgDailySales = partner.suma / currentDayOfMonth;

    console.log(`[WeeklyReport-Generate] Monthly sales: ${partner.suma} PLN over ${currentDayOfMonth} days = ${avgDailySales.toFixed(2)} PLN/day avg`);

    const salesData: WeeklySalesData[] = last7Days.map((date) => {
      return {
        day: getDayName(date),
        date: date,
        sales: avgDailySales,
      };
    });

    console.log('[WeeklyReport-Generate] Generated approximated sales data for 7 days (using monthly average)');

    // Generate chart
    let chartImage: string | undefined;
    try {
      chartImage = await chartGenerator.generateWeeklySummaryChart(
        salesData,
        partner.celTygodniowy
      );
      console.log('[WeeklyReport-Generate] Chart generated successfully');
    } catch (error) {
      console.error('[WeeklyReport-Generate] Failed to generate chart:', error);
      chartImage = undefined;
    }

    // Create summary for PDF actions section
    const driveActionsSummary = topZmiany.map(tc => tc.description);

    // Prepare enhanced report data
    const enhancedData: EnhancedWeeklyReportData = {
      partner,
      actions: [],
      clickupTasks: tasks,
      dateRange,
      historiaZmian,
      topZmiany,
      salesData,
      chartImage,
    };

    // Generate AI content with all data
    // Use formatChangesForAI for detailed history context
    const aiContent = await geminiService.generateWeeklyReport(partner, tasks, {
      wykonaneDzialania,
      historiaZmian: googleDriveService.formatChangesForAI(historiaZmian),
      topZmiany: topZmiany.map(t => `${t.description} (${t.rodzaj})`).join('\n'),
    });

    console.log('[WeeklyReport-Generate] AI content generated');

    // Generate email HTML with enhanced data
    const emailHtml = generateWeeklyReportEmail(partner, aiContent, dateRange, enhancedData);

    // Return preview data WITHOUT sending email
    return NextResponse.json({
      success: true,
      preview: emailHtml,
      aiContent: aiContent,
      reportData: {
        partner,
        dateRange,
        enhancedData,
        tasks,
        driveActionsSummary,
      },
    });
  } catch (error) {
    console.error('Error generating weekly report preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate report preview' },
      { status: 500 }
    );
  }
}
