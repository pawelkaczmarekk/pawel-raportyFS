import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { clickupService } from '@/lib/api/clickup';
import { geminiService } from '@/lib/api/gemini';
import { gmailService } from '@/lib/api/gmail';
import { googleDriveService } from '@/lib/api/google-drive';
import { generatePDFAttachmentEmail } from '@/lib/templates/email';
import { generateWeeklyPDF } from '@/lib/pdf/templates/weekly-report';
import { getLast7DaysRange } from '@/lib/utils/dates';
import { HistoryChange, TopChange } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.refreshToken) {
      return NextResponse.json(
        { error: 'No Gmail authorization. Please log out and log in again to authorize Gmail access.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { partnerName, wykonaneDzialania } = body;

    // Get date range
    const dateRange = getLast7DaysRange();

    // Get sheet name for the month containing the date range
    // Use the start date to determine which month's sheet to read from
    const sheetName = sheetsService.getSheetNameForDate(dateRange.start);

    // Fetch partner data from the appropriate month's sheet
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

    console.log(`[WeeklyReport] Fetched ${tasks.length} ClickUp tasks for ${partnerName}`);

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
        console.log(`[WeeklyReport] Fetched ${historiaZmian.length} history changes, ${topZmiany.length} top changes`);
      } catch (error) {
        console.warn('[WeeklyReport] Failed to fetch history changes from Drive:', error);
      }
    } else {
      console.warn('[WeeklyReport] GOOGLE_DRIVE_FOLDER_ID not configured, skipping history changes');
    }

    // Generate AI content with all data
    const aiContent = await geminiService.generateWeeklyReport(partner, tasks, {
      wykonaneDzialania,
      historiaZmian: googleDriveService.formatChangesForReport(historiaZmian),
      topZmiany: topZmiany.map(t => `${t.description} (${t.rodzaj})`).join('\n'),
    });

    console.log('[WeeklyReport] AI content generated');

    // Generate PDF report
    console.log('[Weekly Report] Generating PDF...');
    const pdfBuffer = await generateWeeklyPDF({
      partner,
      tasks,
      aiContent,
      userInput: { wykonaneDzialania },
      dateRange,
    });
    console.log(`[Weekly Report] PDF generated, size: ${pdfBuffer.length} bytes`);

    // Generate email body
    const emailHtml = generatePDFAttachmentEmail(partner, 'weekly', dateRange);

    // Generate filename
    const dateRangeStr = `${dateRange.start.toISOString().slice(0, 10)}_${dateRange.end.toISOString().slice(0, 10)}`;
    const filename = `Raport_Tygodniowy_${partner.nazwaKonta.replace(/\s+/g, '_')}_${dateRangeStr}.pdf`;

    // Send email with PDF attachment
    const sent = await gmailService.sendEmailWithAttachment(
      {
        to: partner.opiekunFsEmail,
        subject: `Raport tygodniowy - ${partner.nazwaKonta}`,
        html: emailHtml,
        attachments: [{
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      },
      session.refreshToken
    );

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Weekly report sent successfully as PDF attachment',
      filename,
      pdfSize: pdfBuffer.length,
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
