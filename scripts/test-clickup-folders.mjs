#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY;
const BASE_URL = 'https://api.clickup.com/api/v2';
const TEST_LIST_ID = '901214349442'; // From your URL

if (!CLICKUP_API_KEY) {
  console.error('❌ CLICKUP_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('🔍 Testing ClickUp Folder Discovery\n');

async function main() {
  try {
    // Step 1: Verify API key
    console.log('🔑 Verifying API key...');
    const userResponse = await fetch(`${BASE_URL}/user`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });

    if (!userResponse.ok) throw new Error('Authentication failed');

    const userData = await userResponse.json();
    console.log(`✓ Authenticated as: ${userData.user?.username}\n`);

    // Step 2: Get list info to find space
    console.log(`📋 Fetching list info (ID: ${TEST_LIST_ID})...`);
    const listResponse = await fetch(`${BASE_URL}/list/${TEST_LIST_ID}`, {
      headers: { Authorization: CLICKUP_API_KEY },
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      throw new Error(`Failed to fetch list: ${error}`);
    }

    const listData = await listResponse.json();
    console.log(`✓ List: "${listData.name}"`);

    const spaceId = listData.space?.id;
    const folderId = listData.folder?.id;

    console.log(`✓ Space ID: ${spaceId}`);
    if (folderId) console.log(`✓ Parent Folder ID: ${folderId}\n`);
    else console.log(`✓ No parent folder (list is in root of space)\n`);

    // Step 3: Get all folders from the space
    console.log(`📂 Fetching all folders from space ${spaceId}...\n`);
    const foldersResponse = await fetch(
      `${BASE_URL}/space/${spaceId}/folder?archived=false`,
      { headers: { Authorization: CLICKUP_API_KEY } }
    );

    if (!foldersResponse.ok) {
      const error = await foldersResponse.text();
      console.error(`Warning: Could not fetch folders: ${error}`);
      console.log('\n💡 Your ClickUp might use folderless lists. Let me check...\n');

      // Try to get folderless lists directly from space
      const listsResponse = await fetch(
        `${BASE_URL}/space/${spaceId}/list?archived=false`,
        { headers: { Authorization: CLICKUP_API_KEY } }
      );

      if (listsResponse.ok) {
        const listsData = await listsResponse.json();
        const lists = listsData.lists || [];

        console.log(`✅ Found ${lists.length} folderless list(s) in space:\n`);
        lists.forEach(list => {
          console.log(`   📋 ${list.name} (ID: ${list.id})`);
        });

        console.log('\n💡 Recommendation: Use list-based organization instead of folders');
        return;
      }
    }

    const foldersData = await foldersResponse.json();
    const folders = foldersData.folders || [];

    console.log(`✅ Found ${folders.length} folder(s):\n`);

    for (const folder of folders) {
      console.log(`📁 ${folder.name} (ID: ${folder.id})`);

      // Get lists in this folder
      const folderListsResponse = await fetch(
        `${BASE_URL}/folder/${folder.id}/list?archived=false`,
        { headers: { Authorization: CLICKUP_API_KEY } }
      );

      if (folderListsResponse.ok) {
        const folderListsData = await folderListsResponse.json();
        const folderLists = folderListsData.lists || [];

        folderLists.forEach(list => {
          console.log(`   └─ 📋 ${list.name} (ID: ${list.id})`);
        });
      }
      console.log('');
    }

    // Test folder matching
    console.log('\n🎯 Testing folder name matching:\n');
    const testPartners = ['Bonita-sklep-pl', 'HiFood / nutt_pl', 'JUSTBUYSHOP'];

    testPartners.forEach(partnerName => {
      const normalized = partnerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = folders.find(f =>
        f.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized) ||
        normalized.includes(f.name.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );

      if (match) {
        console.log(`✓ "${partnerName}" → "${match.name}" (ID: ${match.id})`);
      } else {
        console.log(`✗ "${partnerName}" → No match found`);
      }
    });

    console.log('\n✅ Discovery complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
