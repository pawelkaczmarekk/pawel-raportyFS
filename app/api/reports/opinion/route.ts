import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { gmailService } from '@/lib/api/gmail';
import { opinionsService } from '@/lib/api/opinions';
import { generateOpinionRequestEmail } from '@/lib/templates/email';

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
    const { partnerName } = body;

    // Fetch partner data
    const partner = await sheetsService.getPartnerByName(partnerName);
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    // Initialize opinions sheet if needed
    await opinionsService.initializeSheet();

    // Generate unique token and save to Sheets
    const token = await opinionsService.createOpinionToken(
      partner.nazwaKonta,
      partner.opiekunFsEmail,
      session.user.email
    );

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Generate email HTML with token
    const emailHtml = generateOpinionRequestEmail(
      partner,
      session.user.email,
      token,
      baseUrl
    );

    // Send email using user's refresh token from session
    // TESTOWANIE: Wysyłka na email zalogowanej osoby zamiast partnera
    const sent = await gmailService.sendEmail(
      {
        to: session.user.email, // Zmienione z partner.opiekunFsEmail dla testów
        subject: `[TEST] Prosba o opinie - ${partner.nazwaKonta}`,
        html: emailHtml,
      },
      session.refreshToken // Pass user's refresh token
    );

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Opinion request sent successfully',
      preview: emailHtml,
    });
  } catch (error) {
    console.error('Error sending opinion request:', error);
    return NextResponse.json(
      { error: 'Failed to send opinion request' },
      { status: 500 }
    );
  }
}
