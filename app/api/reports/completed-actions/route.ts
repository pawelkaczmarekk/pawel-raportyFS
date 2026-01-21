import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { clickupService } from '@/lib/api/clickup';
import { googleDriveService } from '@/lib/api/google-drive';
import { ClickUpTask, HistoryChange, TopChange } from '@/types';

interface CompletedActionsResponse {
  success: boolean;
  data: {
    clickupTasks: ClickUpTask[];
    driveChanges: HistoryChange[];
    topChanges: TopChange[];
    dateRange: {
      start: string;
      end: string;
    };
  };
}

/**
 * GET /api/reports/completed-actions?partnerName=X&days=7
 *
 * Fetches completed actions for a partner from:
 * - ClickUp: completed tasks
 * - Google Drive: history changes from partner sheets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const partnerName = searchParams.get('partnerName');
    const daysParam = searchParams.get('days');

    if (!partnerName) {
      return NextResponse.json(
        { error: 'Missing required parameter: partnerName' },
        { status: 400 }
      );
    }

    // Parse days parameter (default: 7 days)
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    if (isNaN(days) || days < 1 || days > 90) {
      return NextResponse.json(
        { error: 'Invalid days parameter. Must be between 1 and 90.' },
        { status: 400 }
      );
    }

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    console.log(`[CompletedActions] Fetching actions for "${partnerName}" from ${startDate.toLocaleDateString('pl-PL')} to ${endDate.toLocaleDateString('pl-PL')}`);

    // Fetch ClickUp tasks
    let clickupTasks: ClickUpTask[] = [];
    try {
      clickupTasks = await clickupService.getTasksByPartner(
        partnerName,
        startDate,
        endDate
      );
      console.log(`[CompletedActions] Found ${clickupTasks.length} ClickUp tasks`);
    } catch (error) {
      console.error('[CompletedActions] Error fetching ClickUp tasks:', error);
    }

    // Fetch Google Drive history changes
    let driveChanges: HistoryChange[] = [];
    let topChanges: TopChange[] = [];
    const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (driveFolderId) {
      try {
        driveChanges = await googleDriveService.getHistoryChanges(
          driveFolderId,
          partnerName,
          startDate,
          endDate
        );
        topChanges = googleDriveService.getTopChanges(driveChanges, 10);
        console.log(`[CompletedActions] Found ${driveChanges.length} Drive changes, ${topChanges.length} top changes`);
      } catch (error) {
        console.error('[CompletedActions] Error fetching Drive changes:', error);
      }
    } else {
      console.warn('[CompletedActions] GOOGLE_DRIVE_FOLDER_ID not configured');
    }

    const response: CompletedActionsResponse = {
      success: true,
      data: {
        clickupTasks,
        driveChanges,
        topChanges,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[CompletedActions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completed actions' },
      { status: 500 }
    );
  }
}
