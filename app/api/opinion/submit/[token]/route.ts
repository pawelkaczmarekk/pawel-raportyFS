import { NextRequest, NextResponse } from 'next/server';
import { opinionsService } from '@/lib/api/opinions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const searchParams = request.nextUrl.searchParams;
    const stars = searchParams.get('stars');

    if (!stars || isNaN(parseInt(stars)) || parseInt(stars) < 1 || parseInt(stars) > 5) {
      return NextResponse.redirect(new URL('/opinion/error', request.url));
    }

    const rating = parseInt(stars);

    // Get opinion record
    const record = await opinionsService.getOpinionRecord(token);

    if (!record) {
      return NextResponse.redirect(new URL('/opinion/error', request.url));
    }

    // Check if already used
    if (record.used) {
      return NextResponse.redirect(
        new URL('/opinion/already-submitted', request.url)
      );
    }

    // Mark as used in Google Sheets first
    await opinionsService.markAsUsed(token, rating);

    // Build Typeform URL with pre-filled data (hidden fields)
    const typeformBaseUrl = process.env.NEXT_PUBLIC_TYPEFORM_BASE_URL || 'https://form.typeform.com/to';
    const typeformFormId = process.env.NEXT_PUBLIC_TYPEFORM_FORM_ID || 'P1eKSzbs';

    const typeformUrl = new URL(`${typeformBaseUrl}/${typeformFormId}`);
    // Pre-fill hidden fields - these need to match your Typeform field names
    typeformUrl.searchParams.set('rating', rating.toString());
    typeformUrl.searchParams.set('email', record.partnerEmail);
    typeformUrl.searchParams.set('partner', record.partnerName);

    console.log('[Opinion] Redirecting to Typeform with pre-filled data:', {
      rating,
      email: record.partnerEmail,
      partner: record.partnerName,
    });

    // Redirect to Typeform - user will see the form and can submit
    return NextResponse.redirect(typeformUrl);
  } catch (error) {
    console.error('Error processing opinion submission:', error);
    return NextResponse.redirect(new URL('/opinion/error', request.url));
  }
}
