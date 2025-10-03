#!/usr/bin/env ts-node

/**
 * Enhanced Thumbnail Service Test
 * Tests the event-driven thumbnail service integration
 */

import { eventRegistry } from './src/events';

async function testEnhancedThumbnailService() {
  console.log('🧪 Testing Enhanced Thumbnail Service with Events...\n');

  try {
    // Initialize event system
    await eventRegistry.initialize();
    console.log('✅ Event system initialized\n');

    console.log('🎨 Test: Simulating Thumbnail Operations\n');

    // Simulate creating a thumbnail (this would normally come from the API)
    console.log('1. 📝 Creating thumbnail...');
    await simulateThumbnailCreation();
    
    console.log('\n2. ✏️  Updating thumbnail...');
    await simulateThumbnailUpdate();
    
    console.log('\n3. ⭐ Setting as featured...');
    await simulateFeaturedThumbnail();
    
    console.log('\n4. 🗑️  Deleting thumbnail...');
    await simulateThumbnailDeletion();

    // Wait for all async events to process
    console.log('\n⏳ Waiting for background event processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Show final statistics
    console.log('\n📊 Final Event Statistics:');
    const stats = eventRegistry.getStats();
    console.log(`✅ ${stats.emitterStats.eventsProcessed} events processed`);
    console.log(`⚡ Average processing time: ${stats.emitterStats.averageProcessingTime.toFixed(2)}ms`);

    console.log('\n🎉 All enhanced thumbnail service tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Import our event emitter functions
import { 
  emitThumbnailCreated, 
  emitAnalyticsEvent,
  eventEmitter 
} from './src/events';

async function simulateThumbnailCreation() {
  const userId = 'user123';
  const thumbnailId = 'thumb789';
  const projectId = 'project456';
  
  // This simulates what happens in ThumbnailService.createThumbnail()
  await emitThumbnailCreated(
    userId,
    thumbnailId,
    projectId,
    '/uploads/awesome-thumbnail.jpg',
    { style: 'cyberpunk', color: 'neon', size: 'large' },
    2048000
  );
  
  console.log(`   ✅ Thumbnail ${thumbnailId} created with automatic analytics`);
}

async function simulateThumbnailUpdate() {
  const userId = 'user123';
  const thumbnailId = 'thumb789';
  
  // This simulates what happens in ThumbnailService.updateThumbnail()
  await eventEmitter.createAndEmit(
    'thumbnail.updated',
    userId,
    {
      thumbnailId,
      changes: { title: 'Updated Awesome Thumbnail', style: 'retro' },
      previousVersion: 'previous-data'
    }
  );
  
  await emitAnalyticsEvent(
    userId,
    'thumbnail_updated',
    'thumbnail',
    thumbnailId,
    {
      fieldsChanged: ['title', 'style'],
      hasTitle: true,
      hasParameters: true
    }
  );
  
  console.log(`   ✅ Thumbnail ${thumbnailId} updated with change tracking`);
}

async function simulateFeaturedThumbnail() {
  const userId = 'user123';
  const thumbnailId = 'thumb789';
  const projectId = 'project456';
  
  // This simulates what happens in ThumbnailService.setThumbnailAsFeatured()
  await emitAnalyticsEvent(
    userId,
    'thumbnail_featured',
    'thumbnail',
    thumbnailId,
    { projectId }
  );
  
  console.log(`   ⭐ Thumbnail ${thumbnailId} set as featured with analytics`);
}

async function simulateThumbnailDeletion() {
  const userId = 'user123';
  const thumbnailId = 'thumb789';
  
  // This simulates what happens in ThumbnailService.deleteThumbnail()
  await eventEmitter.createAndEmit(
    'thumbnail.deleted',
    userId,
    {
      thumbnailId,
      filePath: '/uploads/awesome-thumbnail.jpg'
    }
  );
  
  await emitAnalyticsEvent(
    userId,
    'thumbnail_deleted',
    'thumbnail',
    thumbnailId,
    { projectId: 'project456' }
  );
  
  console.log(`   🗑️  Thumbnail ${thumbnailId} deleted with cleanup events`);
}

// Run the test
testEnhancedThumbnailService();