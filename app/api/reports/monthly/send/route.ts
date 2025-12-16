import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { gmailService } from '@/lib/api/gmail';
import { generatePDFAttachmentEmail } from '@/lib/templates/email';
import { generateMonthlyPDF } from '@/lib/pdf/templates/monthly-report';

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

    console.log(`[MonthlyReport-Send] Generating PDF for ${partnerName}`);
    console.log(`[MonthlyReport-Send] Partner data:`, {
      nazwaKonta: reportData.partner.nazwaKonta,
      suma: reportData.partner.suma,
      allegroPl: reportData.partner.allegroPl,
      kosztAds: reportData.partner.kosztAds,
    });

    // Generate PDF with the edited AI content
    const pdfBuffer = await generateMonthlyPDF({
      partner: reportData.partner,
      tasks: reportData.tasks || [],
      aiContent: aiContent, // Use the edited content from user
      userInput: userInput || {},
      dateRange: reportData.dateRange,
      celMiesieczny: reportData.celMiesieczny,  // Pass new month goal
      driveActionsSummary: reportData.driveActionsSummary || [],  // Pass Google Drive actions
    });

    console.log(`[MonthlyReport-Send] PDF generated, size: ${pdfBuffer.length} bytes`);

    // Generate simple email body for PDF attachment
    const emailHtml = generatePDFAttachmentEmail(
      reportData.partner,
      'monthly',
      reportData.dateRange
    );

    // Generate filename
    const startDate = new Date(reportData.dateRange.start);
    const month = startDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    const filename = `Raport_Miesieczny_${reportData.partner.nazwaKonta.replace(/\s+/g, '_')}_${month.replace(/\s+/g, '_')}.pdf`;

    // Send email with PDF attachment
    const sent = await gmailService.sendEmailWithAttachment(
      {
        to: reportData.partner.opiekunFsEmail,
        subject: `Raport miesięczny - ${reportData.partner.nazwaKonta}`,
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

    console.log(`[MonthlyReport-Send] Email with PDF sent successfully to ${reportData.partner.opiekunFsEmail}`);

    return NextResponse.json({
      success: true,
      message: 'Monthly report sent successfully as PDF attachment',
      filename,
      pdfSize: pdfBuffer.length,
    });
  } catch (error) {
    console.error('Error sending monthly report:', error);
    return NextResponse.json(
      { error: 'Failed to send report' },
      { status: 500 }
    );
  }
}


