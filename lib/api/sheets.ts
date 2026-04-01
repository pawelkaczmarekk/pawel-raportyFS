import { google } from 'googleapis';
import { Partner, PartnerAction } from '@/types';

// Maps header names from the first row of the sheet to Partner field names
const HEADER_TO_FIELD_MAPPING: Record<string, keyof Partner> = {
  'Opiekun': 'opiekun',
  'Partner': 'partner',
  'Nazwa konta': 'nazwaKonta',
  'Pakiet': 'pakiet',
  'ALLEGRO PL': 'allegroPl',
  'ALLEGRO CZ': 'allegroCz',
  'ALLEGRO SK': 'allegreSk',
  'ALLEGRO HU': 'allegroHu',
  'SUMA': 'suma',
  'ALLEGRO CZ/PL': 'allegroCzPl',
  'ALLEGRO SK/PL': 'allegroSkPl',
  'ALLEGRO HU/PL': 'allegroHuPl',
  'CEL DZIENNY': 'celDzienny',
  'CEL TYGODNIOWY': 'celTygodniowy',
  'CEL': 'cel',
  'REALIZACJI': 'realizacji',
  'PROGRES': 'progres',
  '📈DYNAMIKA R/R': 'dynamikaRR',
  '📈DYNAMIKA M/M': 'dynamikaMM',
  'TREND 2024r': 'trend2024',
  'TREND 2025r': 'trend2025',
  'KOSZT ADS (PLN)': 'kosztAds',
  'PRZYCHÓD ADS (PLN)': 'przychodAds',
  'ZWROT Z ADS  (PLN) POPRZEDNI MIESIĄC': 'zwrotZAdsPoprzedniMiesiac',
  'ZWROT Z ADS': 'zwrotZAds',
  'OCZEKIWANY ZWROT Z ADS': 'oczekiwanyZwrotZAds',
  'ZGODNOŚĆ': 'zgodnosc',
  'UDZIAŁ ADS W PRZYCHODACH': 'udzialAdsWPrzychodach',
  'SUMA PROWIZJI': 'sumaProwizji',
  'DOPUSZCZALNA PROWIZJA': 'dopuszczalnaProwizja',
  '⏰CZAS WYSYŁKI': 'czasWysylki',
  'ILOŚĆ OFERT Z GNC': 'iloscOfertZGnc',
  'ILOŚĆ WYSTAWIONYCH OFERT': 'iloscWystawionychOfert',
  'ILOŚĆ ZOPTYMALIZOWANYCH OFERT': 'iloscZoptymalizowanychOfert',
  'ILOŚĆ  WYRÓŻNIONYCH OFERT': 'iloscWyroznionychOfert',
  'ILOŚĆ OFERT W STREFIE OKAZJI': 'iloscOfertWStrefieOkazji',
  'ALLEGRO DAYS': 'allegroDays',
  'ALLEGRO DIAMOND': 'allegroDiamond',
  'OPIEKUN ADS': 'opiekunAds',
  'RAPORT ALLEGRO ADS': 'raportAllegroAds',
  'ID Sprzedawcy': 'idSprzedawcy',
  'DODATOWE INFORMACJE': 'dodatkoweInformacje',
  'ZYSK ALLEGRO (TYLKO DLA PARTNERÓW VIP)': 'zyskAllegro',
  'Opiekum FS (e-mail)': 'opiekunFsEmail',
  'Opiekum ADS (e-mail)': 'opiekunAdsEmail',
};

const NUMERIC_FIELDS: Set<keyof Partner> = new Set([
  'allegroPl', 'allegroCz', 'allegreSk', 'allegroHu', 'suma',
  'allegroCzPl', 'allegroSkPl', 'allegroHuPl',
  'celDzienny', 'celTygodniowy', 'cel', 'realizacji',
  'kosztAds', 'przychodAds', 'zwrotZAdsPoprzedniMiesiac', 'zwrotZAds', 'oczekiwanyZwrotZAds',
  'sumaProwizji', 'dopuszczalnaProwizja',
  'iloscOfertZGnc', 'iloscWystawionychOfert', 'iloscZoptymalizowanychOfert',
  'iloscWyroznionychOfert', 'iloscOfertWStrefieOkazji', 'zyskAllegro',
]);

export class SheetsService {
  private sheets;
  private sheetsWrite;

  constructor() {
    // Read-only auth for fetching data
    const authReadonly = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          '\n'
        ),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Write auth for updating data
    const authWrite = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
          /\\n/g,
          '\n'
        ),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: authReadonly });
    this.sheetsWrite = google.sheets({ version: 'v4', auth: authWrite });
  }

  async getAllPartners(sheetName?: string): Promise<Partner[]> {
    try {
      // If no sheet name provided, use current month in MM.YYYY format
      if (!sheetName) {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        sheetName = `${month}.${year}`;
      }

      console.log(`[SheetsService] Fetching partners from sheet: ${sheetName}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        range: `'${sheetName}'!A1:AZ`, // Include header row (row 1)
      });

      const allRows = response.data.values || [];
      if (allRows.length < 2) {
        console.warn(`[SheetsService] Sheet ${sheetName} has no data rows`);
        return [];
      }

      const headers = allRows[0];
      const headerIndexMap = this.buildHeaderIndexMap(headers);
      const rows = allRows.slice(1); // Skip header row

      console.log(`[SheetsService] Raw rows fetched: ${rows.length}, mapped headers: ${Object.keys(headerIndexMap).length}`);

      return rows.map((row) => this.mapRowToPartner(row, headerIndexMap));
    } catch (error) {
      console.error('Error fetching partners from Google Sheets:', error);
      throw new Error('Failed to fetch partners data');
    }
  }

  async getLatestSheetName(): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        fields: 'sheets.properties.title',
      });

      const titles = (response.data.sheets || [])
        .map((s: any) => s.properties?.title || '')
        .filter((t: string) => /^\d{2}\.\d{4}$/.test(t));

      if (titles.length === 0) {
        const now = new Date();
        return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
      }

      titles.sort((a: string, b: string) => {
        const [aM, aY] = a.split('.').map(Number);
        const [bM, bY] = b.split('.').map(Number);
        return aY !== bY ? bY - aY : bM - aM;
      });

      console.log(`[SheetsService] Latest sheet found: ${titles[0]}`);
      return titles[0];
    } catch (error) {
      console.error('Error fetching sheet list:', error);
      const now = new Date();
      return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    }
  }

  async getPartnerByName(name: string, sheetName?: string): Promise<Partner | null> {
    const latestSheet = await this.getLatestSheetName();
    const partners = await this.getAllPartners(latestSheet);
    const partner = partners.find((p) => p.nazwaKonta === name) || null;

    if (partner) return partner;

    // Fallback: try the requested sheet if different from latest
    if (sheetName && sheetName !== latestSheet) {
      const fallbackPartners = await this.getAllPartners(sheetName);
      return fallbackPartners.find((p) => p.nazwaKonta === name) || null;
    }

    return null;
  }

  getSheetNameForDate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}.${year}`;
  }

  async getPartnerActions(
    partnerSheetId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PartnerAction[]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: partnerSheetId,
        range: 'A2:D', // Assuming: Data | Opis | Kategoria | Status
      });

      const rows = response.data.values || [];

      return rows
        .map((row) => ({
          data: row[0] || '',
          opis: row[1] || '',
          kategoria: row[2] || '',
          status: row[3] || '',
        }))
        .filter((action) => {
          const actionDate = new Date(action.data);
          return actionDate >= startDate && actionDate <= endDate;
        });
    } catch (error) {
      console.error('Error fetching partner actions:', error);
      return [];
    }
  }

  private buildHeaderIndexMap(headers: any[]): Map<keyof Partner, number> {
    const map = new Map<keyof Partner, number>();
    for (let i = 0; i < headers.length; i++) {
      const headerName = (headers[i] || '').toString().trim();
      const fieldName = HEADER_TO_FIELD_MAPPING[headerName];
      if (fieldName) {
        map.set(fieldName, i);
      }
    }
    return map;
  }

  private mapRowToPartner(row: any[], headerIndexMap: Map<keyof Partner, number>): Partner {
    const get = (field: keyof Partner): any => {
      const idx = headerIndexMap.get(field);
      return idx !== undefined ? row[idx] : undefined;
    };

    const partner = {} as Partner;
    for (const field of Object.values(HEADER_TO_FIELD_MAPPING)) {
      if (NUMERIC_FIELDS.has(field)) {
        (partner as any)[field] = this.parseNumber(get(field));
      } else {
        (partner as any)[field] = get(field) || '';
      }
    }
    return partner;
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle Polish number format: "159 426,62 zł" or "159426,62"
      // 1. Remove currency symbols and whitespace
      let cleaned = value.replace(/[zł€$%\s]/gi, '');
      // 2. Replace comma with dot (Polish decimal separator)
      cleaned = cleaned.replace(',', '.');
      // 3. Remove any remaining non-numeric characters except dot and minus
      cleaned = cleaned.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Convert column index to Excel-style letter (0 = A, 25 = Z, 26 = AA, etc.)
  private indexToColumnLetter(index: number): string {
    let letter = '';
    let tempIndex = index;
    while (tempIndex >= 0) {
      letter = String.fromCharCode((tempIndex % 26) + 65) + letter;
      tempIndex = Math.floor(tempIndex / 26) - 1;
    }
    return letter;
  }

  // Get historical sales data from "Statystyki" sheet for a specific partner
  // Returns last N months BEFORE the current month (for reports about previous month)
  async getStatystykiData(
    partnerName: string,
    monthsBack: number = 5  // Default to 5 months for chart
  ): Promise<{ month: string; sales: number }[]> {
    try {
      console.log(`[SheetsService] Fetching Statystyki data for partner: ${partnerName}`);

      // First, fetch the header row to find the partner's column
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        range: `'Statystyki'!A1:ZZ1`, // Wide range to capture all columns
      });

      const headers = headerResponse.data.values?.[0] || [];
      console.log(`[SheetsService] Statystyki headers count: ${headers.length}`);

      // Find column index matching partner name (case-insensitive, partial match)
      // Priority: 1) exact match, 2) header contains partner name, 3) partner name contains header (with length restrictions)
      let partnerColumnIndex = -1;
      const normalizedPartnerName = partnerName.toLowerCase().replace(/[_-]/g, '');

      // Log all headers for debugging (first 30)
      console.log(`[SheetsService] All Statystyki headers (first 30):`, headers.slice(0, 30));
      console.log(`[SheetsService] Searching for normalized name: "${normalizedPartnerName}"`);

      // First pass: look for exact match only
      for (let i = 0; i < headers.length; i++) {
        const header = (headers[i] || '').toString().toLowerCase().replace(/[_-]/g, '');
        if (header === normalizedPartnerName) {
          partnerColumnIndex = i;
          console.log(`[SheetsService] EXACT match found at index ${i}: "${headers[i]}"`);
          break;
        }
      }

      // Second pass: header contains full partner name
      if (partnerColumnIndex === -1) {
        for (let i = 0; i < headers.length; i++) {
          const header = (headers[i] || '').toString().toLowerCase().replace(/[_-]/g, '');
          if (header.includes(normalizedPartnerName)) {
            partnerColumnIndex = i;
            console.log(`[SheetsService] CONTAINS match found at index ${i}: "${headers[i]}" contains "${normalizedPartnerName}"`);
            break;
          }
        }
      }

      // Third pass: partner name contains header (with strict length restrictions to avoid false positives)
      // Require: header length >= 4 chars AND header is at least 60% of partner name length
      if (partnerColumnIndex === -1) {
        for (let i = 0; i < headers.length; i++) {
          const header = (headers[i] || '').toString().toLowerCase().replace(/[_-]/g, '');
          if (header.length >= 4 &&
              normalizedPartnerName.includes(header) &&
              header.length >= normalizedPartnerName.length * 0.6) {
            partnerColumnIndex = i;
            console.log(`[SheetsService] REVERSE match found at index ${i}: "${normalizedPartnerName}" contains "${headers[i]}" (header length: ${header.length}, min required: ${Math.ceil(normalizedPartnerName.length * 0.6)})`);
            break;
          }
        }
      }

      if (partnerColumnIndex === -1) {
        console.warn(`[SheetsService] Partner "${partnerName}" (normalized: "${normalizedPartnerName}") NOT FOUND in Statystyki headers`);
        console.warn(`[SheetsService] Available headers (first 50):`, headers.slice(0, 50).join(', '));
        return [];
      }

      // Get the column letter for the partner
      const partnerColumnLetter = this.indexToColumnLetter(partnerColumnIndex);
      console.log(`[SheetsService] Final match: "${headers[partnerColumnIndex]}" at column ${partnerColumnLetter} (index ${partnerColumnIndex})`);

      // Fetch only column A (dates) and the specific partner column
      // Use two separate ranges to avoid fetching all columns in between
      const dataResponse = await this.sheets.spreadsheets.values.batchGet({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        ranges: [
          `'Statystyki'!A2:A`,           // Dates column
          `'Statystyki'!${partnerColumnLetter}2:${partnerColumnLetter}`,  // Partner sales column
        ],
      });

      const dateRows = dataResponse.data.valueRanges?.[0]?.values || [];
      const salesRows = dataResponse.data.valueRanges?.[1]?.values || [];
      console.log(`[SheetsService] Statystyki date rows: ${dateRows.length}, sales rows: ${salesRows.length}`);

      // Combine dates and sales - ONLY include valid month entries
      const combinedData: { month: string; sales: number }[] = [];
      const maxRows = Math.max(dateRows.length, salesRows.length);

      for (let i = 0; i < maxRows; i++) {
        const dateValue = (dateRows[i]?.[0] || '').toString().trim();
        const salesValue = salesRows[i]?.[0] || 0;

        // Skip empty rows and non-date rows (like "Wzrot/spadek", headers, etc.)
        if (!dateValue) continue;

        let month: string | null = null;

        // Try MM.YYYY format first (e.g., "11.2024")
        const mmYYYYMatch = dateValue.match(/^(\d{1,2})\.(\d{4})$/);
        if (mmYYYYMatch) {
          month = `${mmYYYYMatch[1].padStart(2, '0')}.${mmYYYYMatch[2]}`;
        }

        // Try YYYY-MM-DD format (e.g., "2024-11-30")
        if (!month) {
          const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (isoMatch) {
            month = `${isoMatch[2]}.${isoMatch[1]}`; // Convert to MM.YYYY
          }
        }

        // Skip rows that don't match any date pattern
        if (!month) {
          console.log(`[SheetsService] Skipping non-month row: "${dateValue}"`);
          continue;
        }

        const sales = this.parseNumber(salesValue);

        // Only include months with actual sales data (sales > 0)
        if (sales > 0) {
          combinedData.push({ month, sales });
        }
      }

      console.log(`[SheetsService] Valid month entries found: ${combinedData.length}`);

      // Sort by date (oldest first)
      combinedData.sort((a, b) => {
        const [aMonth, aYear] = a.month.split('.').map(Number);
        const [bMonth, bYear] = b.month.split('.').map(Number);
        return (aYear * 12 + aMonth) - (bYear * 12 + bMonth);
      });

      // Get current month to exclude it (reports are for previous month)
      const now = new Date();
      const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
      console.log(`[SheetsService] Current month to exclude: ${currentMonth}`);

      // Filter out current month - we want data UP TO previous month
      const historicalData = combinedData.filter(d => d.month !== currentMonth);
      console.log(`[SheetsService] After excluding current month: ${historicalData.length} entries`);

      // Get last N months (from the historical data, not including current month)
      const recentData = historicalData.slice(-monthsBack);
      console.log(`[SheetsService] Last ${monthsBack} months data:`, recentData);

      return recentData;
    } catch (error) {
      console.error('[SheetsService] Error fetching Statystyki data:', error);
      return [];
    }
  }

  // Get partner's sales from a specific previous month (for comparison)
  // Uses Statystyki tab data instead of fetching from individual month sheets
  async getPartnerSalesForMonth(
    partnerName: string,
    date: Date
  ): Promise<number | undefined> {
    try {
      const month = `${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
      console.log(`[SheetsService] Getting sales for ${partnerName} in month ${month} from Statystyki`);

      // Fetch enough months to cover the requested date (24 months should be plenty)
      const statystykiData = await this.getStatystykiData(partnerName, 24);
      const monthData = statystykiData.find(d => d.month === month);

      if (monthData) {
        console.log(`[SheetsService] Found sales for ${month}: ${monthData.sales}`);
      } else {
        console.log(`[SheetsService] No data found for ${month} in Statystyki`);
      }

      return monthData?.sales;
    } catch (error) {
      console.error(`[SheetsService] Error fetching sales for ${partnerName} in ${date}:`, error);
      return undefined;
    }
  }

  // Update partner's monthly goal in the current month's sheet (column N = "cel")
  // Note: Monthly reports are for PREVIOUS month, so goal is set for CURRENT month (the upcoming period)
  async updatePartnerGoal(partnerName: string, goal: number): Promise<boolean> {
    try {
      // Use current month sheet (this is the "upcoming" month relative to the report)
      const now = new Date();
      const sheetName = this.getSheetNameForDate(now);

      console.log(`[SheetsService] Updating goal for ${partnerName} in sheet ${sheetName}`);

      // First, fetch headers to find the right columns dynamically
      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        range: `'${sheetName}'!A1:AZ1`,
      });

      const headers = headerResponse.data.values?.[0] || [];
      const headerIndexMap = this.buildHeaderIndexMap(headers);

      const nazwaKontaIdx = headerIndexMap.get('nazwaKonta');
      const celIdx = headerIndexMap.get('cel');

      if (nazwaKontaIdx === undefined || celIdx === undefined) {
        console.warn(`[SheetsService] Could not find required columns in sheet ${sheetName}`);
        return false;
      }

      const nazwaKontaCol = this.indexToColumnLetter(nazwaKontaIdx);

      // Find the row number for the partner
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        range: `'${sheetName}'!${nazwaKontaCol}2:${nazwaKontaCol}`,
      });

      const rows = response.data.values || [];
      let partnerRowIndex = -1;

      for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] === partnerName) {
          partnerRowIndex = i + 2; // +2 because we start from row 2 (skip header)
          break;
        }
      }

      if (partnerRowIndex === -1) {
        console.warn(`[SheetsService] Partner "${partnerName}" not found in sheet ${sheetName}`);
        return false;
      }

      // Update cel column for the found row
      const celCol = this.indexToColumnLetter(celIdx);
      const updateRange = `'${sheetName}'!${celCol}${partnerRowIndex}`;
      console.log(`[SheetsService] Updating range ${updateRange} with value ${goal}`);

      await this.sheetsWrite.spreadsheets.values.update({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[goal]],
        },
      });

      console.log(`[SheetsService] Successfully updated goal for ${partnerName} to ${goal}`);
      return true;
    } catch (error) {
      console.error(`[SheetsService] Error updating goal for ${partnerName}:`, error);
      throw error;
    }
  }
}

export const sheetsService = new SheetsService();
