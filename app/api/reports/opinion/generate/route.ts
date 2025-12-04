import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { opinionsService } from '@/lib/api/opinions';
import { generateOpinionRequestEmail } from '@/lib/templates/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    console.log(`[OpinionRequest-Generate] Request generated for ${partnerName}`);

    return NextResponse.json({
      success: true,
      aiContent: emailHtml, // For the editor
      preview: emailHtml,
      partner,
      token,
      baseUrl,
      userEmail: session.user.email,
    });
  } catch (error) {
    console.error('Error generating opinion request:', error);
    return NextResponse.json(
      { error: 'Failed to generate opinion request' },
      { status: 500 }
    );
  }
}





