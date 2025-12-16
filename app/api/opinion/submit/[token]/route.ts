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

    // Mark as used in Google Sheets (saves rating, timestamp, sets used=TRUE)
    await opinionsService.markAsUsed(token, rating);

    console.log('[Opinion] Vote saved to Google Sheets:', {
      rating,
      partner: record.partnerName,
      token,
    });

    // Redirect to thank-you page with rating
    const thankYouUrl = new URL('/opinion/thank-you', request.url);
    thankYouUrl.searchParams.set('rating', rating.toString());

    return NextResponse.redirect(thankYouUrl);
  } catch (error) {
    console.error('Error processing opinion submission:', error);
    return NextResponse.redirect(new URL('/opinion/error', request.url));
  }
}
