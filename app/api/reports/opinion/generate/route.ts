import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';
import { opinionsService } from '@/lib/api/opinions';
import { generateOpinionRequestEmail } from '@/lib/templates/email';
import * as fs from 'fs';
import * as path from 'path';

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

    // Get base URL - IMPORTANT: Set NEXTAUTH_URL in production environment!
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    if (baseUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.warn('[WARN] NEXTAUTH_URL contains localhost in production! Rating links will not work.');
    }

    // Read banner image and convert to base64 for email embedding
    let bannerBase64: string | undefined;
    try {
      const bannerPath = path.join(process.cwd(), 'public', 'assets', 'ankieta-banner.jpg');
      if (fs.existsSync(bannerPath)) {
        const bannerBuffer = fs.readFileSync(bannerPath);
        bannerBase64 = bannerBuffer.toString('base64');
      }
    } catch (err) {
      console.warn('Could not read banner image:', err);
    }

    // Generate email HTML with token and embedded banner
    const emailHtml = generateOpinionRequestEmail(
      partner,
      session.user.email,
      token,
      baseUrl,
      bannerBase64
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











