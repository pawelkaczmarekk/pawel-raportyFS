#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const BASE_URL = 'https://api.clickup.com/api/v2';
const SPACE_ID = '44577616';

if (!CLICKUP_API_KEY) {
  console.error('❌ CLICKUP_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔍 Testing ClickUp List Matching\n');

// Test partners from your Google Sheets
const TEST_PARTNERS = [
  'Bonita-sklep-pl',
  'HiFood / nutt_pl',
  'JUSTBUYSHOP',
  'Fernox_sklep',
  'mocowocu',
  'Maced',
];

function normalizeName(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

async function getAllLists() {
  try {
    console.log('📋 Fetching all lists from space...\n');

    const allLists = [];

    // Get all folders
    const foldersResponse = await fetch(
      `${BASE_URL}/space/${SPACE_ID}/folder?archived=false`,
      { headers: { Authorization: CLICKUP_API_KEY } }
    );

    if (!foldersResponse.ok) {
      throw new Error('Failed to fetch folders');
    }

    const foldersData = await foldersResponse.json();
    const folders = foldersData.folders || [];

    console.log(`✓ Found ${folders.length} folders\n`);

    // Get lists from each folder
    for (const folder of folders) {
      const listsResponse = await fetch(
        `${BASE_URL}/folder/${folder.id}/list?archived=false`,
        { headers: { Authorization: CLICKUP_API_KEY } }
      );

      if (!listsResponse.ok) continue;

      const listsData = await listsResponse.json();
      const lists = listsData.lists || [];

      lists.forEach(list => {
        allLists.push({
          id: list.id,
          name: list.name,
          folder: folder.name,
        });
      });
    }

    console.log(`✅ Total lists found: ${allLists.length}\n`);
    return allLists;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

function findListMatch(lists, partnerName) {
  const normalized = normalizeName(partnerName);

  // Strategy 1: Exact match
  let match = lists.find(l => l.name.toLowerCase() === partnerName.toLowerCase());
  if (match) return { match, strategy: '1. Exact match' };

  // Strategy 2: Normalized match
  match = lists.find(l => normalizeName(l.name) === normalized);
  if (match) return { match, strategy: '2. Normalized match' };

  // Strategy 3: Partial match
  match = lists.find(l => normalizeName(l.name).includes(normalized));
  if (match) return { match, strategy: '3. Partial match' };

  // Strategy 4: Reverse partial
  match = lists.find(l => {
    const norm = normalizeName(l.name);
    return norm.length > 3 && normalized.includes(norm);
  });
  if (match) return { match, strategy: '4. Reverse partial' };

  // Strategy 5: Prefix match
  match = lists.find(l => {
    const cleaned = l.name.replace(/^\[.*?\]\s*/, '').replace(/^\(.*?\)\s*/, '');
    return normalizeName(cleaned) === normalized;
  });
  if (match) return { match, strategy: '5. Prefix match' };

  return null;
}

async function main() {
  try {
    const lists = await getAllLists();

    console.log('🎯 Testing Partner Matching:\n');
    console.log('═'.repeat(80) + '\n');

    let successCount = 0;
    let failCount = 0;

    for (const partner of TEST_PARTNERS) {
      const result = findListMatch(lists, partner);

      if (result) {
        successCount++;
        console.log(`✅ "${partner}"`);
        console.log(`   Strategy: ${result.strategy}`);
        console.log(`   Matched List: "${result.match.name}"`);
        console.log(`   List ID: ${result.match.id}`);
        console.log(`   Folder: ${result.match.folder}`);
        console.log('');
      } else {
        failCount++;
        console.log(`❌ "${partner}"`);
        console.log(`   No match found`);
        console.log(`   Available similar lists:`);

        // Show possibly related lists
        const normalized = normalizeName(partner);
        const similar = lists.filter(l => {
          const listNorm = normalizeName(l.name);
          return listNorm.includes(normalized.slice(0, 5)) || normalized.includes(listNorm.slice(0, 5));
        }).slice(0, 3);

        if (similar.length > 0) {
          similar.forEach(s => console.log(`     • ${s.name} (in folder: ${s.folder})`));
        } else {
          console.log(`     (none found)`);
        }
        console.log('');
      }
    }

    console.log('═'.repeat(80));
    console.log(`\n📊 Results: ${successCount}/${TEST_PARTNERS.length} partners matched successfully`);

    if (failCount > 0) {
      console.log(`\n⚠️  ${failCount} partner(s) need manual mapping or list renaming`);
    } else {
      console.log('\n🎉 All partners matched successfully!');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();
