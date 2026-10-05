import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { clickupService } from '@/lib/api/clickup';
import { aiService } from '@/lib/api/ai-service';
import { gmailService } from '@/lib/api/gmail';
import { generatePDFAttachmentEmail } from '@/lib/templates/email';
import { generateMonthlyPDF } from '@/lib/pdf/templates/monthly-report';
import { getPreviousMonthRange } from '@/lib/utils/dates';

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
    const { partnerName, osiagniecia, wyzwania, plany } = body;

    // Get date range
    const dateRange = getPreviousMonthRange();

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
    const aiContent = await aiService.generateMonthlyReport(partner, tasks, {
      osiagniecia,
      wyzwania,
      plany,
    });

    // Generate PDF report
    console.log('[Monthly Report] Generating PDF...');
    const pdfBuffer = await generateMonthlyPDF({
      partner,
      tasks,
      aiContent,
      userInput: { osiagniecia, wyzwania, plany },
      dateRange,
    });
    console.log(`[Monthly Report] PDF generated, size: ${pdfBuffer.length} bytes`);

    // Generate email body
    const emailHtml = generatePDFAttachmentEmail(partner, 'monthly', dateRange);

    // Generate filename
    const monthName = dateRange.start.toLocaleDateString('pl-PL', {
      month: 'long',
      year: 'numeric',
    }).replace(/\s+/g, '_');
    const filename = `Raport_Miesieczny_${partner.nazwaKonta.replace(/\s+/g, '_')}_${monthName}.pdf`;

    // Send email with PDF attachment
    const sent = await gmailService.sendEmailWithAttachment(
      {
        to: partner.opiekunFsEmail,
        subject: `Raport miesięczny - ${partner.nazwaKonta} - ${monthName.replace(/_/g, ' ')}`,
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
      message: 'Monthly report sent successfully as PDF attachment',
      filename,
      pdfSize: pdfBuffer.length,
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
