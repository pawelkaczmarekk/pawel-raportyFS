import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { clickupService } from '@/lib/api/clickup';
import { geminiService } from '@/lib/api/gemini';
import { generateMonthlyReportEmail } from '@/lib/templates/email';
import { getPreviousMonthRange } from '@/lib/utils/dates';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { partnerName, celMiesieczny, osiagniecia, wyzwania, plany } = body;

    // Get date range
    const dateRange = getPreviousMonthRange();

    // If user provided a monthly goal, update it in the current month's sheet
    if (celMiesieczny && celMiesieczny > 0) {
      try {
        await sheetsService.updatePartnerGoal(partnerName, celMiesieczny);
        console.log(`[MonthlyReport-Generate] Updated goal for ${partnerName}: ${celMiesieczny} PLN`);
      } catch (error) {
        console.error(`[MonthlyReport-Generate] Failed to update goal:`, error);
        // Continue with report generation even if goal update fails
      }
    }

    // Get sheet name for previous month (MM.YYYY format)
    const sheetName = sheetsService.getSheetNameForDate(dateRange.start);

    // Fetch partner data from the previous month's sheet
    const partner = await sheetsService.getPartnerByName(partnerName, sheetName);
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

    // Generate AI content
    const aiContent = await geminiService.generateMonthlyReport(partner, tasks, {
      osiagniecia,
      wyzwania,
      plany,
    });

    // Generate email HTML preview
    const emailHtml = generateMonthlyReportEmail(partner, aiContent, dateRange);

    console.log(`[MonthlyReport-Generate] Report generated for ${partnerName}`);
    console.log(`[MonthlyReport-Generate] Partner data:`, {
      nazwaKonta: partner.nazwaKonta,
      suma: partner.suma,
      allegroPl: partner.allegroPl,
      kosztAds: partner.kosztAds,
    });

    return NextResponse.json({
      success: true,
      aiContent,
      preview: emailHtml,
      partner,
      dateRange,
      celMiesieczny,
      osiagniecia,
      wyzwania,
      plany,
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}





