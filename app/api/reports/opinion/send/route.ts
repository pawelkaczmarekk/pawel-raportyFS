import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { gmailService } from '@/lib/api/gmail';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.refreshToken) {
      return NextResponse.json(
        { error: 'No Gmail authorization. Please log out and log in again to authorize Gmail access.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { partnerName, aiContent, reportData } = body;

    if (!reportData || !reportData.partner) {
      return NextResponse.json(
        { error: 'Missing report data' },
        { status: 400 }
      );
    }

    console.log(`[OpinionRequest-Send] Sending request for ${partnerName}`);

    const subject = `Prosba o opinie - ${reportData.partner.nazwaKonta}`;
    console.log('[OpinionRequest-Send] Subject:', subject);
    console.log('[OpinionRequest-Send] Subject hex:', Buffer.from(subject).toString('hex'));

    // Send email using user's refresh token from session
    // Use sendEmail (no attachments needed for opinion requests)
    const sent = await gmailService.sendEmail(
      {
        to: session.user.email, // TODO: zmień na reportData.partner.opiekunFsEmail dla produkcji
        subject: subject,
        html: aiContent,
      },
      session.refreshToken
    );

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    console.log(`[OpinionRequest-Send] Email sent successfully to ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Opinion request sent successfully',
    });
  } catch (error) {
    console.error('Error sending opinion request:', error);
    return NextResponse.json(
      { error: 'Failed to send opinion request' },
      { status: 500 }
    );
  }
}







