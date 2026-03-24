import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sheetsService } from '@/lib/api/sheets';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sheetName = await sheetsService.getLatestSheetName();
    const partners = await sheetsService.getAllPartners(sheetName);

    console.log(`[Partners API] Total partners fetched: ${partners.length}`);
    console.log(`[Partners API] First 3 partners:`, partners.slice(0, 3).map(p => p.nazwaKonta));

    // Filter out partners with empty names
    const validPartners = partners.filter((p) => p.nazwaKonta && p.nazwaKonta.trim() !== '');

    console.log(`[Partners API] Valid partners (non-empty names): ${validPartners.length}`);

    return NextResponse.json({
      partners: validPartners.map((p, index) => ({
        // Always use a combination to ensure uniqueness
        id: `${index}-${p.nazwaKonta}`,
        name: p.nazwaKonta,
        email: p.opiekunFsEmail,
      })),
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}
