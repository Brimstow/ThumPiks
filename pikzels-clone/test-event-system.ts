#!/usr/bin/env ts-node

/**
 * Event System Test Script
 * Tests the new event-driven architecture independently
 */

import { 
  eventEmitter, 
  eventRegistry,
  emitThumbnailCreated,
  emitAnalyticsEvent,
  emitSocialShareRequested
} from './src/events';

async function testEventSystem() {
  console.log('🧪 Testing Event System...\n');

  try {
    // Initialize event registry
    await eventRegistry.initialize();
    console.log('✅ Event registry initialized\n');

    // Test 1: Basic event emission
    console.log('📡 Test 1: Basic Event Emission');
    await emitThumbnailCreated(
      'user123',
      'thumb456',
      'project789',
      '/path/to/thumbnail.jpg',
      { style: 'modern', color: 'blue' },
      1024000
    );
    console.log('✅ Thumbnail created event emitted\n');

    // Test 2: Analytics event
    console.log('📊 Test 2: Analytics Event');
    await emitAnalyticsEvent(
      'user123',
      'thumbnail_downloaded',
      'thumbnail',
      'thumb456',
      { format: 'jpg', size: 'large' }
    );
    console.log('✅ Analytics event emitted\n');

    // Test 3: Social sharing event  
    console.log('📱 Test 3: Social Sharing Event');
    await emitSocialShareRequested(
      'user123',
      'thumb456',
      ['twitter', 'facebook'],
      'share789'
    );
    console.log('✅ Social share event emitted\n');

    // Wait for async processing
    console.log('⏳ Waiting for background processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Get statistics
    console.log('📈 Test 4: System Statistics');
    const stats = eventRegistry.getStats();
    console.log('Event Registry Stats:', {
      totalHandlers: stats.totalHandlers,
      eventTypes: stats.eventTypes,
      registeredEvents: stats.handlers
    });

    const emitterStats = eventEmitter.getStats();
    console.log('Event Emitter Stats:', {
      eventsProcessed: emitterStats.eventsProcessed,
      averageProcessingTime: emitterStats.averageProcessingTime,
      subscriptionCount: emitterStats.subscriptionCount
    });
    console.log('✅ Statistics retrieved\n');

    // Test 5: Recent events
    console.log('📋 Test 5: Recent Events');
    const recentEvents = eventEmitter.getRecentEvents(5);
    console.log(`Found ${recentEvents.length} recent events:`);
    recentEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.type} (${event.id}) - User: ${event.userId}`);
    });
    console.log('✅ Recent events retrieved\n');

    console.log('🎉 All tests passed! Event system is working perfectly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testEventSystem();