import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clickupService } from '@/lib/api/clickup';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all lists from ClickUp
    const lists = await clickupService.getAllLists();

    // Format response
    return NextResponse.json({
      success: true,
      count: lists.length,
      lists: lists.map(list => ({
        id: list.id,
        name: list.name,
        folder: list.folder ? {
          id: list.folder.id,
          name: list.folder.name,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching ClickUp lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}
