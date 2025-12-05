/**
 * Test script to verify all data sources are working
 * Run with: npx ts-node --esm scripts/test-data-sources.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const results: { source: string; status: 'OK' | 'ERROR'; details: string }[] = [];

async function testGoogleSheets() {
  console.log('\n📊 Testing Google Sheets...');
  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get current month sheet name
    const now = new Date();
    const sheetName = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.MAIN_SHEET_ID,
      range: `${sheetName}!A2:C10`,
    });

    const rows = response.data.values || [];
    results.push({
      source: 'Google Sheets (Main)',
      status: 'OK',
      details: `Found ${rows.length} rows in sheet "${sheetName}". First partner: ${rows[0]?.[1] || 'N/A'}`,
    });
    console.log(`   ✅ Connected! Found ${rows.length} partners in "${sheetName}"`);
  } catch (error: any) {
    results.push({
      source: 'Google Sheets (Main)',
      status: 'ERROR',
      details: error.message,
    });
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testReportsSheet() {
  console.log('\n📋 Testing Reports Data Sheet...');
  try {
    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.REPORTS_DATA_SHEET_ID,
    });

    const sheetNames = response.data.sheets?.map(s => s.properties?.title) || [];
    results.push({
      source: 'Google Sheets (Reports)',
      status: 'OK',
      details: `Sheets: ${sheetNames.join(', ')}`,
    });
    console.log(`   ✅ Connected! Sheets: ${sheetNames.join(', ')}`);
  } catch (error: any) {
    results.push({
      source: 'Google Sheets (Reports)',
      status: 'ERROR',
      details: error.message,
    });
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testClickUp() {
  console.log('\n📝 Testing ClickUp API...');
  try {
    const SPACE_ID = '44577616';
    const response = await fetch(`https://api.clickup.com/api/v2/space/${SPACE_ID}/folder?archived=false`, {
      headers: {
        'Authorization': process.env.CLICKUP_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const folderCount = data.folders?.length || 0;

    // Also get lists
    const listsResponse = await fetch(`https://api.clickup.com/api/v2/space/${SPACE_ID}/list?archived=false`, {
      headers: {
        'Authorization': process.env.CLICKUP_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });
    const listsData = await listsResponse.json();
    const listCount = listsData.lists?.length || 0;

    results.push({
      source: 'ClickUp',
      status: 'OK',
      details: `Found ${folderCount} folders, ${listCount} folderless lists`,
    });
    console.log(`   ✅ Connected! ${folderCount} folders, ${listCount} folderless lists`);
  } catch (error: any) {
    results.push({
      source: 'ClickUp',
      status: 'ERROR',
      details: error.message,
    });
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testGeminiAI() {
  console.log('\n🤖 Testing Gemini AI...');
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const result = await model.generateContent('Odpowiedz jednym słowem: Jaki jest kolor nieba?');
    const response = await result.response;
    const text = response.text();

    results.push({
      source: 'Gemini AI',
      status: 'OK',
      details: `Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}, Response: "${text.substring(0, 50)}..."`,
    });
    console.log(`   ✅ Connected! Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
    console.log(`   Response: "${text.trim()}"`);
  } catch (error: any) {
    results.push({
      source: 'Gemini AI',
      status: 'ERROR',
      details: error.message,
    });
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testTypeform() {
  console.log('\n📝 Testing Typeform...');
  try {
    const formId = process.env.NEXT_PUBLIC_TYPEFORM_FORM_ID;
    const baseUrl = process.env.NEXT_PUBLIC_TYPEFORM_BASE_URL;

    if (!formId || !baseUrl) {
      throw new Error('Missing TYPEFORM_FORM_ID or BASE_URL');
    }

    // Check if form URL is accessible
    const formUrl = `${baseUrl}/${formId}`;
    const response = await fetch(formUrl, { method: 'HEAD' });

    if (response.ok || response.status === 200) {
      results.push({
        source: 'Typeform',
        status: 'OK',
        details: `Form ID: ${formId}, URL accessible`,
      });
      console.log(`   ✅ Form accessible! ID: ${formId}`);
    } else {
      throw new Error(`Form URL returned ${response.status}`);
    }
  } catch (error: any) {
    results.push({
      source: 'Typeform',
      status: 'ERROR',
      details: error.message,
    });
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testGoogleDrive() {
  console.log('\n📁 Testing Google Drive...');
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      results.push({
        source: 'Google Drive',
        status: 'OK',
        details: 'Not configured (GOOGLE_DRIVE_FOLDER_ID not set) - optional feature',
      });
      console.log('   ⚠️  Not configured (optional) - GOOGLE_DRIVE_FOLDER_ID not set');
      return;
    }

    const { google } = await import('googleapis');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
      pageSize: 5,
      fields: 'files(id, name)',
    });

    const fileCount = response.data.files?.length || 0;
    results.push({
      source: 'Google Drive',
      status: 'OK',
      details: `Found ${fileCount} spreadsheets in folder`,
    });
    console.log(`   ✅ Connected! Found ${fileCount} spreadsheets in folder`);
  } catch (error: any) {
    results.push({
      source: 'Google Drive',
      status: 'ERROR',
      details: error.message,
    });
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Testing all data sources...\n');
  console.log('=' .repeat(60));

  await testGoogleSheets();
  await testReportsSheet();
  await testClickUp();
  await testGeminiAI();
  await testTypeform();
  await testGoogleDrive();

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');

  const okCount = results.filter(r => r.status === 'OK').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;

  for (const result of results) {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${result.source}: ${result.status}`);
    console.log(`   ${result.details}\n`);
  }

  console.log('='.repeat(60));
  console.log(`\nTotal: ${okCount} OK, ${errorCount} ERROR`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
