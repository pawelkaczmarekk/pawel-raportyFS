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

    // Send email using user's refresh token from session
    // TESTOWANIE: Wysyłka na email zalogowanej osoby zamiast partnera
    const sent = await gmailService.sendEmail(
      {
        to: session.user.email, // Zmienione z partner.opiekunFsEmail dla testów
        subject: `[TEST] Prośba o opinię - ${reportData.partner.nazwaKonta}`,
        html: aiContent, // Use the edited HTML from editor
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





