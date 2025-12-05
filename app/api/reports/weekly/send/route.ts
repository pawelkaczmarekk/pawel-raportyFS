import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { gmailService } from '@/lib/api/gmail';
import { generatePDFAttachmentEmail } from '@/lib/templates/email';
import { generateWeeklyPDF } from '@/lib/pdf/templates/weekly-report';

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
    const { partnerName, aiContent, reportData, userInput } = body;

    if (!reportData || !reportData.partner || !reportData.dateRange) {
      return NextResponse.json(
        { error: 'Missing report data' },
        { status: 400 }
      );
    }

    console.log(`[WeeklyReport-Send] Generating PDF for ${partnerName}`);

    // Generate PDF with the edited AI content
    const pdfBuffer = await generateWeeklyPDF({
      partner: reportData.partner,
      tasks: reportData.enhancedData?.clickupTasks || reportData.tasks || [],
      aiContent: aiContent, // Use the edited content from user
      userInput: userInput || {},
      dateRange: reportData.dateRange,
      driveActionsSummary: reportData.driveActionsSummary || [],  // Pass Google Drive actions
    });

    console.log(`[WeeklyReport-Send] PDF generated, size: ${pdfBuffer.length} bytes`);

    // Generate simple email body for PDF attachment
    const emailHtml = generatePDFAttachmentEmail(
      reportData.partner,
      'weekly',
      reportData.dateRange
    );

    // Generate filename
    const dateRangeStr = `${new Date(reportData.dateRange.start).toISOString().slice(0, 10)}_${new Date(reportData.dateRange.end).toISOString().slice(0, 10)}`;
    const filename = `Raport_Tygodniowy_${reportData.partner.nazwaKonta.replace(/\s+/g, '_')}_${dateRangeStr}.pdf`;

    // Send email with PDF attachment
    const sent = await gmailService.sendEmailWithAttachment(
      {
        to: reportData.partner.opiekunFsEmail,
        subject: `Raport tygodniowy - ${reportData.partner.nazwaKonta}`,
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

    console.log(`[WeeklyReport-Send] Email with PDF sent successfully to ${reportData.partner.opiekunFsEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Weekly report sent successfully as PDF attachment',
      filename,
      pdfSize: pdfBuffer.length,
    });
  } catch (error) {
    console.error('Error sending weekly report:', error);
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 }
    );
  }
}
