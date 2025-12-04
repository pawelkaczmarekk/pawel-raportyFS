import { google } from 'googleapis';

export interface OpinionRecord {
  token: string;
  partnerName: string;
  partnerEmail: string;
  opiekunEmail: string;
  rating?: number;
  timestamp: string;
  used: boolean;
}

export class OpinionsService {
  private sheets;
  private sheetName = 'Opinion_Responses';

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
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async initializeSheet() {
    try {
      // Check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
      });

      const sheetExists = spreadsheet.data.sheets?.some(
        (sheet) => sheet.properties?.title === this.sheetName
      );

      if (!sheetExists) {
        // Create the sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: this.sheetName,
                  },
                },
              },
            ],
          },
        });

        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
          range: `${this.sheetName}!A1:G1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [[
              'Token',
              'Partner Name',
              'Partner Email',
              'Opiekun Email',
              'Rating',
              'Timestamp',
              'Used',
            ]],
          },
        });
      }
    } catch (error) {
      console.error('Error initializing opinions sheet:', error);
      throw error;
    }
  }

  async createOpinionToken(
    partnerName: string,
    partnerEmail: string,
    opiekunEmail: string
  ): Promise<string> {
    const token = this.generateToken();
    const timestamp = new Date().toISOString();

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
      range: `${this.sheetName}!A:G`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          token,
          partnerName,
          partnerEmail,
          opiekunEmail,
          '', // Rating - empty until used
          timestamp,
          'FALSE', // Used
        ]],
      },
    });

    return token;
  }

  async getOpinionRecord(token: string): Promise<OpinionRecord | null> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
        range: `${this.sheetName}!A:G`,
      });

      const rows = response.data.values || [];
      const dataRows = rows.slice(1); // Skip header

      const recordRow = dataRows.find((row) => row[0] === token);
      if (!recordRow) return null;

      return {
        token: recordRow[0],
        partnerName: recordRow[1],
        partnerEmail: recordRow[2],
        opiekunEmail: recordRow[3],
        rating: recordRow[4] ? parseInt(recordRow[4]) : undefined,
        timestamp: recordRow[5],
        used: recordRow[6] === 'TRUE',
      };
    } catch (error) {
      console.error('Error getting opinion record:', error);
      return null;
    }
  }

  async markAsUsed(token: string, rating: number): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
        range: `${this.sheetName}!A:G`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row) => row[0] === token);

      if (rowIndex === -1) {
        throw new Error('Token not found');
      }

      // Update rating (column E) and used (column G)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
        range: `${this.sheetName}!E${rowIndex + 1}:G${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[rating.toString(), new Date().toISOString(), 'TRUE']],
        },
      });
    } catch (error) {
      console.error('Error marking opinion as used:', error);
      throw error;
    }
  }

  private generateToken(): string {
    return `opinion_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}

export const opinionsService = new OpinionsService();
