import { ClickUpTask } from '@/types';

interface ClickUpList {
  id: string;
  name: string;
  folder?: {
    id: string;
    name: string;
  };
}

export class ClickUpService {
  private apiKey: string;
  private baseUrl = 'https://api.clickup.com/api/v2';
  private listsCache: ClickUpList[] | null = null;
  private cacheTimestamp: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private SPACE_ID = '44577616'; // Your ClickUp workspace space ID

  constructor() {
    this.apiKey = process.env.CLICKUP_API_KEY || '';
  }

  /**
   * Fetch all lists from the ClickUp space (across all folders)
   * Uses caching to avoid repeated API calls
   */
  async getAllLists(): Promise<ClickUpList[]> {
    const now = Date.now();

    // Return cached lists if still valid
    if (this.listsCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      console.log('[ClickUp] Using cached lists');
      return this.listsCache;
    }

    try {
      console.log('[ClickUp] Fetching all lists from space:', this.SPACE_ID);

      const allLists: ClickUpList[] = [];

      // Step 1: Get all folders from space
      const foldersResponse = await fetch(
        `${this.baseUrl}/space/${this.SPACE_ID}/folder?archived=false`,
        { headers: { Authorization: this.apiKey } }
      );

      if (!foldersResponse.ok) {
        console.warn('[ClickUp] Failed to fetch folders, trying folderless lists...');
        // Try to get folderless lists directly
        return await this.getFolderlessLists();
      }

      const foldersData = await foldersResponse.json();
      const folders = foldersData.folders || [];

      console.log(`[ClickUp] Found ${folders.length} folder(s)`);

      // Step 2: For each folder, get lists
      for (const folder of folders) {
        const listsResponse = await fetch(
          `${this.baseUrl}/folder/${folder.id}/list?archived=false`,
          { headers: { Authorization: this.apiKey } }
        );

        if (!listsResponse.ok) continue;

        const listsData = await listsResponse.json();
        const lists = listsData.lists || [];

        lists.forEach((list: any) => {
          allLists.push({
            id: list.id,
            name: list.name,
            folder: {
              id: folder.id,
              name: folder.name,
            },
          });
        });
      }

      // Step 3: Also get folderless lists
      const folderlessLists = await this.getFolderlessLists();
      allLists.push(...folderlessLists);

      console.log(`[ClickUp] Total lists found: ${allLists.length}`);

      // Update cache
      this.listsCache = allLists;
      this.cacheTimestamp = now;

      return allLists;
    } catch (error) {
      console.error('[ClickUp] Error fetching lists:', error);

      // Return cached data if available, even if expired
      if (this.listsCache) {
        console.log('[ClickUp] Returning stale cache due to error');
        return this.listsCache;
      }

      return [];
    }
  }

  /**
   * Get lists that are not in any folder (directly in space)
   */
  private async getFolderlessLists(): Promise<ClickUpList[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/space/${this.SPACE_ID}/list?archived=false`,
        { headers: { Authorization: this.apiKey } }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const lists = data.lists || [];

      return lists.map((list: any) => ({
        id: list.id,
        name: list.name,
      }));
    } catch (error) {
      console.error('[ClickUp] Error fetching folderless lists:', error);
      return [];
    }
  }

  /**
   * Normalize name for matching (remove special chars, lowercase, trim)
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric
  }

  /**
   * Find ClickUp list by partner name using smart matching
   * Tries multiple strategies: exact, normalized, partial
   */
  async findListByPartnerName(partnerName: string): Promise<string | null> {
    const lists = await this.getAllLists();

    if (lists.length === 0) {
      console.warn('[ClickUp] No lists available for matching');
      return null;
    }

    const normalizedPartner = this.normalizeName(partnerName);
    console.log(`[ClickUp] Looking for list matching partner: "${partnerName}" (normalized: "${normalizedPartner}")`);

    // Strategy 1: Exact match (case-insensitive)
    let match = lists.find(l => l.name.toLowerCase() === partnerName.toLowerCase());
    if (match) {
      console.log(`[ClickUp] Found exact match: "${match.name}" (ID: ${match.id})`);
      return match.id;
    }

    // Strategy 2: Normalized match (remove special chars)
    match = lists.find(l => this.normalizeName(l.name) === normalizedPartner);
    if (match) {
      console.log(`[ClickUp] Found normalized match: "${match.name}" (ID: ${match.id})`);
      return match.id;
    }

    // Strategy 3: Partial match (list contains partner name)
    match = lists.find(l => this.normalizeName(l.name).includes(normalizedPartner));
    if (match) {
      console.log(`[ClickUp] Found partial match: "${match.name}" (ID: ${match.id})`);
      return match.id;
    }

    // Strategy 4: Reverse partial (partner name contains list name)
    match = lists.find(l => {
      const normalizedList = this.normalizeName(l.name);
      return normalizedList.length > 3 && normalizedPartner.includes(normalizedList);
    });
    if (match) {
      console.log(`[ClickUp] Found reverse partial match: "${match.name}" (ID: ${match.id})`);
      return match.id;
    }

    // Strategy 5: Prefix match (e.g., "[PB] Bonita-sklep-pl" matches "Bonita-sklep-pl")
    match = lists.find(l => {
      // Remove common prefixes like [XX] or (XX)
      const cleanedName = l.name.replace(/^\[.*?\]\s*/, '').replace(/^\(.*?\)\s*/, '');
      return this.normalizeName(cleanedName) === normalizedPartner;
    });
    if (match) {
      console.log(`[ClickUp] Found prefix match: "${match.name}" (ID: ${match.id})`);
      return match.id;
    }

    // Strategy 6: Fallback to env mapping
    const envMapping = this.getPartnerListMapping();
    if (envMapping[partnerName]) {
      console.log(`[ClickUp] Using environment variable fallback mapping`);
      return envMapping[partnerName];
    }

    console.warn(`[ClickUp] No list found for partner: "${partnerName}"`);
    console.log(`[ClickUp] Available lists (first 10): ${lists.slice(0, 10).map(l => l.name).join(', ')}`);

    return null;
  }

  async getTasksFromList(
    listId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ClickUpTask[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/list/${listId}/task?archived=false&date_closed_gt=${startDate.getTime()}&date_closed_lt=${endDate.getTime()}`,
        {
          headers: {
            Authorization: this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`ClickUp API error: ${response.statusText}`);
      }

      const data = await response.json();
      const tasks = data.tasks || [];

      // Filter only closed tasks
      return tasks.filter(
        (task: any) =>
          task.status?.status?.toLowerCase() === 'closed' ||
          task.status?.status?.toLowerCase() === 'complete'
      );
    } catch (error) {
      console.error('Error fetching ClickUp tasks:', error);
      return [];
    }
  }

  async getTasksByPartner(
    partnerName: string,
    startDate: Date,
    endDate: Date
  ): Promise<ClickUpTask[]> {
    // Use dynamic list discovery
    const listId = await this.findListByPartnerName(partnerName);

    if (!listId) {
      console.warn(`[ClickUp] No list mapping found for partner: ${partnerName}`);
      return [];
    }

    console.log(`[ClickUp] Fetching tasks for partner "${partnerName}" from list ID: ${listId}`);
    return this.getTasksFromList(listId, startDate, endDate);
  }

  /**
   * Legacy fallback: Get list mapping from environment variable
   * @deprecated Use dynamic list discovery instead
   */
  private getPartnerListMapping(): Record<string, string> {
    try {
      // Support both old CLICKUP_FOLDER_MAPPING and new CLICKUP_LIST_MAPPING
      const mapping = process.env.CLICKUP_LIST_MAPPING || process.env.CLICKUP_FOLDER_MAPPING;
      return mapping ? JSON.parse(mapping) : {};
    } catch (error) {
      console.error('Error parsing ClickUp list mapping:', error);
      return {};
    }
  }

  formatTasksForReport(tasks: ClickUpTask[]): string {
    if (tasks.length === 0) {
      return 'Brak zakończonych zadań w tym okresie.';
    }

    return tasks
      .map((task, index) => {
        const closedDate = task.date_closed
          ? new Date(parseInt(task.date_closed)).toLocaleDateString('pl-PL')
          : 'N/A';
        return `${index + 1}. ${task.name} (zakończone: ${closedDate})${
          task.description ? `\n   ${task.description}` : ''
        }`;
      })
      .join('\n\n');
  }

  /**
   * Clear the lists cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.listsCache = null;
    this.cacheTimestamp = 0;
    console.log('[ClickUp] Cache cleared');
  }
}

export const clickupService = new ClickUpService();
