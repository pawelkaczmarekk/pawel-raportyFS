/**
 * Test script to verify monthly report API with Google Drive integration
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  // Dynamically import services
  const { sheetsService } = await import('../lib/api/sheets');
  const { clickupService } = await import('../lib/api/clickup');
  const { geminiService } = await import('../lib/api/gemini');
  const { googleDriveService } = await import('../lib/api/google-drive');
  const { getPreviousMonthRange } = await import('../lib/utils/dates');

  const partnerName = 'cakedecor';

  console.log('\n=== Monthly Report API Test for: ' + partnerName + ' ===\n');

  // Get date range (previous month)
  const dateRange = getPreviousMonthRange();
  console.log('Date range: ' + dateRange.start.toLocaleDateString('pl-PL') + ' - ' + dateRange.end.toLocaleDateString('pl-PL'));

  // Get sheet name for previous month
  const sheetName = sheetsService.getSheetNameForDate(dateRange.start);
  console.log('Sheet name: ' + sheetName);

  // Fetch partner data
  console.log('\n1. Fetching partner data...');
  const partner = await sheetsService.getPartnerByName(partnerName, sheetName);
  if (!partner) {
    console.error('Partner not found!');
    process.exit(1);
  }
  console.log('   Partner: ' + partner.nazwaKonta);
  console.log('   Suma: ' + partner.suma?.toLocaleString('pl-PL') + ' PLN');

  // Fetch ClickUp tasks
  console.log('\n2. Fetching ClickUp tasks...');
  const tasks = await clickupService.getTasksByPartner(partnerName, dateRange.start, dateRange.end);
  console.log('   Found ' + tasks.length + ' tasks');

  // Fetch Google Drive history
  console.log('\n3. Fetching Google Drive history...');
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  let historiaDzialan = '';

  if (driveFolderId) {
    const historyChanges = await googleDriveService.getHistoryChanges(
      driveFolderId,
      partnerName,
      dateRange.start,
      dateRange.end
    );
    console.log('   Found ' + historyChanges.length + ' history changes');

    if (historyChanges.length > 0) {
      historiaDzialan = googleDriveService.formatChangesForAI(historyChanges);
      console.log('   Formatted for AI: ' + historiaDzialan.length + ' chars');
    }
  }

  // Generate AI content
  console.log('\n4. Generating AI content...');
  const aiContent = await geminiService.generateMonthlyReport(partner, tasks, {
    osiagniecia: 'Wzrost sprzedazy o 10%',
    wyzwania: 'Sezonowe spadki',
    plany: 'Nowe kampanie ADS',
    historiaDzialan: historiaDzialan,
  });

  console.log('\n=== AI Generated Content ===\n');
  console.log(aiContent);
  console.log('\n=== Test Complete ===\n');
}

main().catch(console.error);
