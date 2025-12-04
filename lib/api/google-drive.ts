import { google } from 'googleapis';
import { HistoryChange, TopChange } from '@/types';

class GoogleDriveService {
  private drive;
  private sheets;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          '\n'
        ),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
      ],
    });

    this.drive = google.drive({ version: 'v3', auth });
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async getHistoryChanges(
    folderId: string,
    partnerName: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoryChange[]> {
    try {
      console.log(
        `[GoogleDrive] Fetching history changes for ${partnerName} from ${startDate.toLocaleDateString('pl-PL')} to ${endDate.toLocaleDateString('pl-PL')}`
      );

      // OPTIMIZATION 1: Filter files by partner name in the query
      // Normalize partner name for search (remove special characters, spaces)
      const normalizedPartnerName = this.normalizePartnerName(partnerName);

      console.log(`[GoogleDrive] Searching for files matching: "${normalizedPartnerName}"`);

      // Search for files containing partner name
      const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name contains '${normalizedPartnerName}'`;

      const response = await this.drive.files.list({
        q: query,
        fields: 'files(id, name, mimeType, modifiedTime)',
        orderBy: 'modifiedTime desc', // Most recent first
      });

      const files = response.data.files || [];
      console.log(`[GoogleDrive] Found ${files.length} files matching "${normalizedPartnerName}"`);

      if (files.length === 0) {
        console.warn(`[GoogleDrive] No files found for partner "${partnerName}" (searched: "${normalizedPartnerName}")`);
        return [];
      }

      const allChanges: HistoryChange[] = [];

      // OPTIMIZATION 2: Process only the most relevant file (usually the first match)
      // If you have one file per partner, this will process only that file
      const targetFile = files[0]; // Take the most recently modified file

      console.log(`[GoogleDrive] Processing file: ${targetFile.name} (ID: ${targetFile.id})`);

      if (targetFile.mimeType === 'application/vnd.google-apps.spreadsheet' && targetFile.id) {
        // OPTIMIZATION 3: Pass date range to parseSheetFile for early filtering
        const changes = await this.parseSheetFile(targetFile.id, partnerName, startDate, endDate);
        allChanges.push(...changes);
      }

      console.log(
        `[GoogleDrive] Total changes found: ${allChanges.length} for ${partnerName} in date range`
      );

      return allChanges;
    } catch (error) {
      console.error('[GoogleDrive] Error fetching history changes:', error);
      console.error('[GoogleDrive] Error details:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Normalize partner name for file search
   * Handles common variations like spaces, underscores, dashes
   */
  private normalizePartnerName(partnerName: string): string {
    // Remove special characters and replace spaces with underscores
    // Example: "Partner Name" -> "Partner_Name" or "partner-name"
    return partnerName
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^\w-]/g, ''); // Remove special chars except underscore and dash
  }

  private async parseSheetFile(
    fileId: string,
    partnerName: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoryChange[]> {
    try {
      // Get all sheet tabs
      const metadata = await this.sheets.spreadsheets.get({
        spreadsheetId: fileId,
      });

      const sheets = metadata.data.sheets || [];
      const allChanges: HistoryChange[] = [];

      console.log(`[GoogleDrive] File has ${sheets.length} sheet tab(s)`);

      // OPTIMIZATION 4: Process only relevant sheets (skip empty or system sheets)
      for (const sheet of sheets) {
        const sheetName = sheet.properties?.title;
        if (!sheetName) continue;

        // Skip hidden or system sheets
        if (sheet.properties?.hidden) {
          console.log(`[GoogleDrive] Skipping hidden sheet: ${sheetName}`);
          continue;
        }

        console.log(`[GoogleDrive] Reading sheet tab: "${sheetName}"`);

        // OPTIMIZATION 5: Read only necessary columns (A-G = 7 columns)
        // This reduces data transfer and token usage
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: fileId,
          range: `${sheetName}!A2:G`, // Skip header row, columns A-G
          majorDimension: 'ROWS',
        });

        const rows = response.data.values || [];
        console.log(`[GoogleDrive] Sheet "${sheetName}" has ${rows.length} data rows`);

        let rowsProcessed = 0;
        let rowsMatched = 0;

        for (const row of rows) {
          rowsProcessed++;

          // Map columns: Data zdarzenia | Godzina | Konto | Rodzaj | ID oferty | Wartość | Wartość przed
          if (row.length >= 7) {
            try {
              const dateStr = row[0];
              const parsedDate = this.parseDate(dateStr);

              // OPTIMIZATION 6: Early date filtering - skip rows outside date range
              // This prevents unnecessary parsing of irrelevant data
              if (parsedDate < startDate || parsedDate > endDate) {
                continue; // Skip this row - outside date range
              }

              const change: HistoryChange = {
                dataZdarzenia: parsedDate,
                godzinaZdarzenia: row[1] || '',
                konto: row[2] || '',
                rodzaj: row[3] || '',
                idOferty: row[4] || '',
                wartosc: this.parseNumber(row[5]),
                wartoscPrzed: this.parseNumber(row[6]),
              };

              // OPTIMIZATION 7: Validate data before adding
              // Only add if we have a valid date and account name
              if (change.konto && !isNaN(change.dataZdarzenia.getTime())) {
                // OPTIMIZATION 8: Additional partner name matching
                // In case file contains multiple partners, filter by exact match
                const kontoLower = change.konto.toLowerCase();
                const partnerLower = partnerName.toLowerCase();

                if (kontoLower.includes(partnerLower) || partnerLower.includes(kontoLower)) {
                  allChanges.push(change);
                  rowsMatched++;
                }
              }
            } catch (error) {
              console.error(
                '[GoogleDrive] Error parsing row:',
                row.slice(0, 3), // Log only first 3 columns for privacy
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        }

        console.log(
          `[GoogleDrive] Sheet "${sheetName}": Processed ${rowsProcessed} rows, matched ${rowsMatched} changes in date range`
        );
      }

      return allChanges;
    } catch (error) {
      console.error(
        `[GoogleDrive] Error parsing sheet file ${fileId}:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Try different date formats
    // Format 1: DD.MM.YYYY or DD/MM/YYYY
    const dmyMatch = dateStr.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Format 2: YYYY-MM-DD
    const ymdMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Fallback: try native Date parsing
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private parseNumber(value: string): number {
    if (!value) return 0;

    // Remove any whitespace and replace comma with dot for decimal separator
    const cleaned = value.toString().replace(/\s/g, '').replace(',', '.');

    // Remove any non-numeric characters except dot and minus
    const numStr = cleaned.replace(/[^\d.-]/g, '');

    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? 0 : parsed;
  }

  getTopChanges(changes: HistoryChange[], limit: number = 5): TopChange[] {
    // Calculate change magnitude and sort
    const changesWithMagnitude = changes.map((change) => {
      const magnitude = Math.abs(change.wartosc - change.wartoscPrzed);

      let description = '';
      if (change.wartosc > change.wartoscPrzed) {
        description = `Wzrost wartości o ${magnitude.toFixed(2)} PLN`;
      } else if (change.wartosc < change.wartoscPrzed) {
        description = `Spadek wartości o ${magnitude.toFixed(2)} PLN`;
      } else {
        description = `Zmiana: ${change.rodzaj}`;
      }

      return {
        description,
        konto: change.konto,
        rodzaj: change.rodzaj,
        wartoscZmiany: magnitude,
        dataZdarzenia: change.dataZdarzenia,
      };
    });

    // Sort by magnitude and take top N
    const sorted = changesWithMagnitude.sort(
      (a, b) => b.wartoscZmiany - a.wartoscZmiany
    );

    return sorted.slice(0, limit);
  }

  formatChangesForReport(changes: HistoryChange[]): string {
    if (changes.length === 0) {
      return 'Brak zmian w historii dla tego partnera w ostatnim tygodniu.';
    }

    const grouped: Record<string, HistoryChange[]> = {};

    changes.forEach((change) => {
      if (!grouped[change.rodzaj]) {
        grouped[change.rodzaj] = [];
      }
      grouped[change.rodzaj].push(change);
    });

    let formatted = `Znaleziono ${changes.length} zmian w systemie:\n\n`;

    Object.entries(grouped).forEach(([rodzaj, items]) => {
      formatted += `${rodzaj}: ${items.length} zmian\n`;
    });

    return formatted;
  }
}

export const googleDriveService = new GoogleDriveService();
