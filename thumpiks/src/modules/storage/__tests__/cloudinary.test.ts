/**
 * Cloudinary Storage Integration Test
 * 
 * Run manually: npx ts-node src/modules/storage/__tests__/cloudinary.test.ts
 */

import 'dotenv/config';
import { getStorageService, getCloudinaryProvider } from '../index';

async function testCloudinaryIntegration() {
  console.log('🧪 Testing Cloudinary Integration...\n');

  // Test 1: Check if Cloudinary is configured
  console.log('1️⃣ Checking Cloudinary configuration...');
  const storage = getStorageService();
  const isAvailable = await storage.isAvailable();
  console.log(`   Cloudinary available: ${isAvailable ? '✅ Yes' : '❌ No'}`);

  if (!isAvailable) {
    console.log('\n⚠️ Cloudinary not configured. Set CLOUDINARY_URL in .env');
    console.log('   Format: cloudinary://api_key:api_secret@cloud_name');
    return;
  }

  // Test 2: Health check
  console.log('\n2️⃣ Running health check...');
  const health = await storage.healthCheck();
  console.log(`   Cloudinary: ${health.cloudinary.healthy ? '✅ Healthy' : '❌ Down'}`);
  if (health.cloudinary.latency) {
    console.log(`   Latency: ${health.cloudinary.latency}ms`);
  }

  // Test 3: Upload a test image from URL
  console.log('\n3️⃣ Testing image upload from URL...');
  try {
    const testImageUrl = 'https://placehold.co/400x300/png';
    const result = await storage.uploadEphemeral(testImageUrl, {
      folder: 'thumpiks/test',
      tags: ['test', 'integration'],
    });
    console.log(`   ✅ Upload successful!`);
    console.log(`   Public ID: ${result.publicId}`);
    console.log(`   URL: ${result.secureUrl}`);
    console.log(`   Size: ${result.width}x${result.height} (${result.bytes} bytes)`);

    // Test 4: Delete the test image
    console.log('\n4️⃣ Cleaning up test image...');
    const deleteResult = await storage.delete(result.publicId);
    console.log(`   Deleted: ${deleteResult.success ? '✅ Yes' : '❌ No'}`);

  } catch (error: any) {
    console.error(`   ❌ Upload failed: ${error.message}`);
  }

  // Test 5: Get transformed URL
  console.log('\n5️⃣ Testing URL transformation...');
  const provider = getCloudinaryProvider();
  const transformedUrl = provider.getTransformedUrl('sample', {
    width: 640,
    height: 360,
    crop: 'fill',
    quality: 'auto',
    format: 'webp',
  });
  console.log(`   Transformed URL: ${transformedUrl}`);

  console.log('\n✅ All tests completed!\n');
}

// Run if executed directly
if (require.main === module) {
  testCloudinaryIntegration().catch(console.error);
}

export { testCloudinaryIntegration };
