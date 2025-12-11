import { google } from 'googleapis';
import { Partner, PartnerAction } from '@/types';

const SHEET_COLUMN_MAPPING = {
  A: 'opiekun',
  B: 'nazwaKonta',
  C: 'pakiet',
  D: 'allegroPl',
  E: 'allegroCz',
  F: 'allegreSk',
  G: 'allegroHu',
  H: 'suma',
  I: 'allegroCzPl',
  J: 'allegroSkPl',
  K: 'allegroHuPl',
  L: 'celDzienny',
  M: 'celTygodniowy',
  N: 'cel',
  O: 'realizacji',
  P: 'progres',
  Q: 'dynamikaRR',
  R: 'dynamikaMM',
  S: 'trend2024',
  T: 'trend2025',
  U: 'kosztAds',
  V: 'przychodAds',
  W: 'zwrotZAdsPoprzedniMiesiac',
  X: 'zwrotZAds',
  Y: 'oczekiwanyZwrotZAds',
  // Z: zgodnosc - REMOVED
  AA: 'udzialAdsWPrzychodach',
  AB: 'sumaProwizji',
  AC: 'dopuszczalnaProwizja',
  AD: 'czasWysylki',
  AE: 'iloscOfertZGnc',
  AF: 'iloscWystawionychOfert',
  AG: 'iloscZoptymalizowanychOfert',
  AH: 'iloscWyroznionychOfert',
  AI: 'iloscOfertWStrefieOkazji',
  AJ: 'allegroDays',
  AK: 'allegroDiamond',
  AL: 'opiekunAds',
  AM: 'raportAllegroAds',
  AN: 'idSprzedawcy',
  AO: 'dodatkoweInformacje',
  AP: 'zyskAllegro',
  AQ: 'opiekunFsEmail',
  AR: 'opiekunAdsEmail',
};

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
        range: `'${sheetName}'!A2:AR`, // Use specific sheet tab and skip header row
      });

      const rows = response.data.values || [];

      console.log(`[SheetsService] Raw rows fetched: ${rows.length}`);

      return rows.map((row) => this.mapRowToPartner(row));
    } catch (error) {
      console.error('Error fetching partners from Google Sheets:', error);
      throw new Error('Failed to fetch partners data');
    }
  }

  async getPartnerByName(name: string, sheetName?: string): Promise<Partner | null> {
    const partners = await this.getAllPartners(sheetName);
    return partners.find((p) => p.nazwaKonta === name) || null;
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

  private mapRowToPartner(row: any[]): Partner {
    return {
      opiekun: row[0] || '',
      nazwaKonta: row[1] || '',
      pakiet: row[2] || '',
      allegroPl: this.parseNumber(row[3]),
      allegroCz: this.parseNumber(row[4]),
      allegreSk: this.parseNumber(row[5]),
      allegroHu: this.parseNumber(row[6]),
      suma: this.parseNumber(row[7]),
      allegroCzPl: this.parseNumber(row[8]),
      allegroSkPl: this.parseNumber(row[9]),
      allegroHuPl: this.parseNumber(row[10]),
      celDzienny: this.parseNumber(row[11]),
      celTygodniowy: this.parseNumber(row[12]),
      cel: this.parseNumber(row[13]),
      realizacji: this.parseNumber(row[14]),
      progres: row[15] || '',
      dynamikaRR: row[16] || '',
      dynamikaMM: row[17] || '',
      trend2024: row[18] || '',
      trend2025: row[19] || '',
      kosztAds: this.parseNumber(row[20]),
      przychodAds: this.parseNumber(row[21]),
      zwrotZAdsPoprzedniMiesiac: this.parseNumber(row[22]),
      zwrotZAds: this.parseNumber(row[23]),
      oczekiwanyZwrotZAds: this.parseNumber(row[24]),
      // zgodnosc: row[25] - REMOVED
      udzialAdsWPrzychodach: row[26] || '',
      sumaProwizji: this.parseNumber(row[27]),
      dopuszczalnaProwizja: this.parseNumber(row[28]),
      czasWysylki: row[29] || '',
      iloscOfertZGnc: this.parseNumber(row[30]),
      iloscWystawionychOfert: this.parseNumber(row[31]),
      iloscZoptymalizowanychOfert: this.parseNumber(row[32]),
      iloscWyroznionychOfert: this.parseNumber(row[33]),
      iloscOfertWStrefieOkazji: this.parseNumber(row[34]),
      allegroDays: row[35] || '',
      allegroDiamond: row[36] || '',
      opiekunAds: row[37] || '',
      raportAllegroAds: row[38] || '',
      idSprzedawcy: row[39] || '',
      dodatkoweInformacje: row[40] || '',
      zyskAllegro: this.parseNumber(row[41]),
      opiekunFsEmail: row[42] || '',
      opiekunAdsEmail: row[43] || '',
    };
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
      let partnerColumnIndex = -1;
      const normalizedPartnerName = partnerName.toLowerCase().replace(/[_-]/g, '');

      for (let i = 0; i < headers.length; i++) {
        const header = (headers[i] || '').toString().toLowerCase().replace(/[_-]/g, '');
        if (header === normalizedPartnerName ||
            header.includes(normalizedPartnerName) ||
            normalizedPartnerName.includes(header)) {
          partnerColumnIndex = i;
          console.log(`[SheetsService] Found partner column at index ${i}: ${headers[i]}`);
          break;
        }
      }

      if (partnerColumnIndex === -1) {
        console.warn(`[SheetsService] Partner "${partnerName}" not found in Statystyki headers`);
        return [];
      }

      // Get the column letter for the partner
      const partnerColumnLetter = this.indexToColumnLetter(partnerColumnIndex);
      console.log(`[SheetsService] Partner column letter: ${partnerColumnLetter}`);

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
  async getPartnerSalesForMonth(
    partnerName: string,
    date: Date
  ): Promise<number | undefined> {
    try {
      const sheetName = this.getSheetNameForDate(date);
      const partner = await this.getPartnerByName(partnerName, sheetName);
      return partner?.suma;
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

      // First, find the row number for the partner
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.MAIN_SHEET_ID,
        range: `'${sheetName}'!B2:B`, // Column B = nazwaKonta
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

      // Update column N (cel) for the found row
      const updateRange = `'${sheetName}'!N${partnerRowIndex}`;
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
