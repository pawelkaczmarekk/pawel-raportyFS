/**
 * Test script to verify Google Drive integration in monthly reports
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const { googleDriveService } = await import('../lib/api/google-drive');

  const partnerName = 'cakedecor';
  const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!driveFolderId) {
    console.error('GOOGLE_DRIVE_FOLDER_ID not configured');
    process.exit(1);
  }

  console.log('\nTesting Google Drive integration for partner: ' + partnerName);
  console.log('Folder ID: ' + driveFolderId);
  console.log('='.repeat(80));

  // Test with a wider date range to find data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 2); // Last 2 months

  console.log('\nDate range: ' + startDate.toLocaleDateString('pl-PL') + ' - ' + endDate.toLocaleDateString('pl-PL'));

  try {
    const changes = await googleDriveService.getHistoryChanges(
      driveFolderId,
      partnerName,
      startDate,
      endDate
    );

    console.log('\nFound ' + changes.length + ' history changes\n');

    if (changes.length > 0) {
      console.log('Sample changes (first 5):');
      changes.slice(0, 5).forEach((change, i) => {
        console.log('\n' + (i + 1) + '. ' + change.rodzaj);
        console.log('   Data: ' + change.dataZdarzenia.toLocaleDateString('pl-PL') + ' ' + change.godzinaZdarzenia);
        console.log('   Konto: ' + change.konto);
        console.log('   ID oferty: ' + (change.idOferty || 'N/A'));
        if (change.wartosc) {
          const val = change.wartosc.substring(0, 80);
          console.log('   Wartosc: "' + val + (change.wartosc.length > 80 ? '...' : '') + '"');
        }
        if (change.wartoscPrzed) {
          const prev = change.wartoscPrzed.substring(0, 80);
          console.log('   Poprzednia: "' + prev + (change.wartoscPrzed.length > 80 ? '...' : '') + '"');
        }
      });

      // Test formatChangesForAI
      console.log('\n' + '='.repeat(80));
      console.log('Formatted for AI:\n');
      const formatted = googleDriveService.formatChangesForAI(changes);
      console.log(formatted.substring(0, 2000) + (formatted.length > 2000 ? '\n...(truncated)' : ''));

      // Test getTopChanges
      console.log('\n' + '='.repeat(80));
      console.log('Top Changes:\n');
      const topChanges = googleDriveService.getTopChanges(changes, 5);
      topChanges.forEach((tc, i) => {
        console.log((i + 1) + '. ' + tc.description + ' - ' + tc.rodzaj);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('Test complete!\n');
}

main().catch(console.error);
