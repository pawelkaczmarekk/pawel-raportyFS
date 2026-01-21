/**
 * Test script for finding partners with ClickUp tasks
 * Run with: npx tsx scripts/test-data-fetch.ts
 */

// Must load env vars BEFORE any imports that use them
import { config } from 'dotenv';
config({ path: '.env.local' });

// Dynamic imports to ensure env is loaded first
async function main() {
  // Clear module cache to get fresh clickup service with updated code
  const { ClickUpService } = await import('../lib/api/clickup');
  const { getPreviousMonthRange } = await import('../lib/utils/dates');

  const clickupService = new ClickUpService();

  console.log('='.repeat(60));
  console.log('TEST POBIERANIA ZADAŃ Z POPRAWIONYM FILTREM STATUSÓW');
  console.log('='.repeat(60));

  // Get date range for previous month
  const dateRange = getPreviousMonthRange();
  console.log(`\nZakres dat: ${dateRange.start.toLocaleDateString('pl-PL')} - ${dateRange.end.toLocaleDateString('pl-PL')}`);

  // Test specific partners that we know have tasks
  const testPartners = [
    'netrack_pl',      // Has "zakończone" tasks
    'ERCOLE',          // Has "gotowe" tasks
    'jameshawk',       // Has "gotowe" tasks
    'osigo',           // Has "complete" tasks
    'zdrowysklep24',   // Has "gotowe" tasks
  ];

  console.log(`\nTestuję ${testPartners.length} partnerów...\n`);

  for (const partnerName of testPartners) {
    console.log('-'.repeat(50));
    console.log(`PARTNER: ${partnerName}`);

    const tasks = await clickupService.getTasksByPartner(
      partnerName,
      dateRange.start,
      dateRange.end
    );

    console.log(`Znaleziono ${tasks.length} zakończonych zadań w tym okresie`);

    if (tasks.length > 0) {
      console.log('Zadania:');
      tasks.slice(0, 5).forEach((t: any) => {
        const closedDate = t.date_closed
          ? new Date(parseInt(t.date_closed)).toLocaleDateString('pl-PL')
          : '-';
        console.log(`  - ${t.name} (zamknięte: ${closedDate}, status: ${t.status?.status})`);
      });
      if (tasks.length > 5) {
        console.log(`  ... i ${tasks.length - 5} więcej`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('TEST ZAKOŃCZONY');
  console.log('='.repeat(60));
}

main().catch(console.error);
