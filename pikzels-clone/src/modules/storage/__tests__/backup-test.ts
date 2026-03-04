/**
 * Cloudinary Backup Verification Test
 * 
 * Tests that auto-backup is working by:
 * 1. Uploading an image with backup:true
 * 2. Checking that backed-up versions exist
 * 3. Overwriting the same publicId to create a version
 * 4. Listing versions to confirm backup
 * 5. Cleaning up
 * 
 * Run: npx ts-node src/modules/storage/__tests__/backup-test.ts
 */

import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

async function testBackup() {
  console.log('🔒 Testing Cloudinary Auto-Backup...\n');

  // Parse CLOUDINARY_URL
  const url = process.env.CLOUDINARY_URL;
  if (!url) {
    console.log('❌ CLOUDINARY_URL not set in .env');
    return;
  }

  const match = url.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
  if (!match || !match[1] || !match[2] || !match[3]) {
    console.log('❌ Invalid CLOUDINARY_URL format');
    return;
  }

  cloudinary.config({
    api_key: match[1],
    api_secret: match[2],
    cloud_name: match[3],
    secure: true,
  });

  const testPublicId = 'thumpiks/test/backup_test_image';

  try {
    // Step 1: Upload with backup enabled
    console.log('1️⃣ Uploading test image (with backup:true)...');
    const result1 = await cloudinary.uploader.upload(
      'https://placehold.co/400x300/blue/white?text=Version+1',
      {
        public_id: testPublicId,
        backup: true,
        overwrite: true,
      }
    );
    console.log(`   ✅ Uploaded v1: ${result1.secure_url}`);
    console.log(`   Version: ${result1.version}`);

    // Step 2: Overwrite with a different image to create version history
    console.log('\n2️⃣ Overwriting with new image to create version...');
    const result2 = await cloudinary.uploader.upload(
      'https://placehold.co/400x300/red/white?text=Version+2',
      {
        public_id: testPublicId,
        backup: true,
        overwrite: true,
      }
    );
    console.log(`   ✅ Uploaded v2: ${result2.secure_url}`);
    console.log(`   Version: ${result2.version}`);

    // Step 3: Check if versions exist via Admin API
    console.log('\n3️⃣ Checking backup versions...');
    try {
      const resource = await cloudinary.api.resource(testPublicId, {
        versions: true,
      });

      if (resource.versions && resource.versions.length > 0) {
        console.log(`   ✅ BACKUP IS WORKING! Found ${resource.versions.length} version(s):`);
        resource.versions.forEach((v: any, i: number) => {
          console.log(`      v${i + 1}: version_id=${v.version_id}, created=${v.created_at}`);
        });
      } else {
        console.log('   ⚠️ No versions found.');
        console.log('   This likely means auto-backup is NOT enabled.');
        console.log('   → Go to: https://console.cloudinary.com/app/settings/backup');
        console.log('   → Toggle "Enable automatic backup" ON');
        console.log('   → Save Changes, then re-run this test');
      }
    } catch (apiError: any) {
      if (apiError.error?.message?.includes('versions')) {
        console.log('   ⚠️ Versions API not available — backup may not be enabled.');
      } else {
        console.log(`   ⚠️ Could not check versions: ${apiError.message || apiError}`);
      }
      console.log('   → Enable backup at: https://console.cloudinary.com/app/settings/backup');
    }

    // Step 4: Clean up
    console.log('\n4️⃣ Cleaning up test image...');
    await cloudinary.uploader.destroy(testPublicId);
    console.log('   ✅ Test image deleted');

    // Step 5: Test restore (if backup was working)
    console.log('\n5️⃣ Attempting to restore from backup...');
    try {
      const restoreResult = await cloudinary.api.restore([testPublicId]);
      if ((restoreResult as any)[testPublicId]) {
        console.log('   ✅ RESTORE WORKS! Asset recovered from backup');
        // Clean up the restored asset
        await cloudinary.uploader.destroy(testPublicId);
        console.log('   ✅ Cleaned up restored asset');
      }
    } catch (restoreError: any) {
      console.log(`   ⚠️ Restore test: ${restoreError.message || 'Not available without backup'}`);
    }

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
  }

  console.log('\n📋 Summary:');
  console.log('   - If versions were found → Auto-backup is ON ✅');
  console.log('   - If restore worked → You can recover deleted assets ✅');
  console.log('   - If neither worked → Enable backup in Cloudinary console');
  console.log('     https://console.cloudinary.com/app/settings/backup\n');
}

if (require.main === module) {
  testBackup().catch(console.error);
}

export { testBackup };
