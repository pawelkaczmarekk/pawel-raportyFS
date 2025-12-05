/**
 * Script to inspect Google Drive folder structure and spreadsheet contents
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { google } = await import('googleapis');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  });

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  console.log(`\n📁 Inspecting Google Drive folder: ${folderId}\n`);
  console.log('='.repeat(80));

  // List all files in folder
  const response = await drive.files.list({
    q: `'${folderId}' in parents`,
    pageSize: 20,
    fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
  });

  const files = response.data.files || [];
  console.log(`\n📄 Found ${files.length} files in folder:\n`);

  for (const file of files) {
    console.log(`  - ${file.name}`);
    console.log(`    ID: ${file.id}`);
    console.log(`    Type: ${file.mimeType}`);
    console.log(`    Modified: ${file.modifiedTime}`);
    console.log('');
  }

  // Inspect first spreadsheet in detail
  const spreadsheets = files.filter(f => f.mimeType === 'application/vnd.google-apps.spreadsheet');

  if (spreadsheets.length > 0) {
    console.log('='.repeat(80));
    console.log(`\n📊 Inspecting first spreadsheet: "${spreadsheets[0].name}"\n`);

    const spreadsheetId = spreadsheets[0].id!;

    // Get spreadsheet metadata
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetTabs = sheetInfo.data.sheets || [];
    console.log(`Sheet tabs (${sheetTabs.length}):`);
    for (const tab of sheetTabs) {
      console.log(`  - "${tab.properties?.title}" (rows: ${tab.properties?.gridProperties?.rowCount}, cols: ${tab.properties?.gridProperties?.columnCount})`);
    }

    // Read first sheet's header row and sample data
    const firstSheetName = sheetTabs[0]?.properties?.title || 'Sheet1';
    console.log(`\n📋 Reading data from "${firstSheetName}"...\n`);

    // Get headers (row 1)
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${firstSheetName}'!A1:Z1`,
    });
    const headers = headersResponse.data.values?.[0] || [];
    console.log('Column headers:');
    headers.forEach((h, i) => {
      const colLetter = String.fromCharCode(65 + i);
      console.log(`  ${colLetter}: "${h}"`);
    });

    // Get sample data (first 5 data rows)
    console.log('\n📝 Sample data (first 5 rows):\n');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${firstSheetName}'!A2:Z6`,
    });
    const rows = dataResponse.data.values || [];

    for (let i = 0; i < rows.length; i++) {
      console.log(`Row ${i + 2}:`);
      const row = rows[i];
      headers.forEach((h, j) => {
        if (row[j]) {
          console.log(`  ${h}: "${row[j]}"`);
        }
      });
      console.log('');
    }

    // Check if there are more spreadsheets with different structures
    if (spreadsheets.length > 1) {
      console.log('='.repeat(80));
      console.log(`\n📊 Inspecting second spreadsheet: "${spreadsheets[1].name}"\n`);

      const spreadsheetId2 = spreadsheets[1].id!;
      const sheetInfo2 = await sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId2,
      });

      const sheetTabs2 = sheetInfo2.data.sheets || [];
      console.log(`Sheet tabs (${sheetTabs2.length}):`);
      for (const tab of sheetTabs2) {
        console.log(`  - "${tab.properties?.title}"`);
      }

      const firstSheetName2 = sheetTabs2[0]?.properties?.title || 'Sheet1';
      const headersResponse2 = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId2,
        range: `'${firstSheetName2}'!A1:Z1`,
      });
      const headers2 = headersResponse2.data.values?.[0] || [];
      console.log('\nColumn headers:');
      headers2.forEach((h, i) => {
        const colLetter = String.fromCharCode(65 + i);
        console.log(`  ${colLetter}: "${h}"`);
      });

      // Sample data
      console.log('\n📝 Sample data (first 3 rows):\n');
      const dataResponse2 = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId2,
        range: `'${firstSheetName2}'!A2:Z4`,
      });
      const rows2 = dataResponse2.data.values || [];

      for (let i = 0; i < rows2.length; i++) {
        console.log(`Row ${i + 2}:`);
        const row = rows2[i];
        headers2.forEach((h, j) => {
          if (row[j]) {
            console.log(`  ${h}: "${row[j]}"`);
          }
        });
        console.log('');
      }
    }
  }

  console.log('='.repeat(80));
  console.log('\n✅ Inspection complete!\n');
}

main().catch(console.error);
