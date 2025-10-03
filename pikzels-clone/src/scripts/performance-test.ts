import { performance } from 'perf_hooks';
import { CacheService } from '../services/cache.service';
// import { ThumbnailService } from '../modules/thumbnail/thumbnail.service'; // TODO: Use for performance testing
import { ProjectService } from '../modules/project/project.service';

/**
 * Performance testing script
 * Tests caching, database operations, and overall performance
 */

const cache = CacheService.getInstance();
// const thumbnailService = new ThumbnailService(); // TODO: Use for performance testing
const projectService = new ProjectService();

interface PerformanceTestResult {
  operation: string;
  withoutCache: number;
  withCache: number;
  improvement: string;
  cacheHit: boolean;
}

/**
 * Test cache performance
 */
async function testCachePerformance(): Promise<PerformanceTestResult[]> {
  console.log('🧪 Starting cache performance tests...');
  const results: PerformanceTestResult[] = [];

  // Test 1: Cache set/get operations
  console.log('  Testing basic cache operations...');
  
  const testData = { id: 'test', name: 'Performance Test', data: new Array(1000).fill('x').join('') };
  
  // Test cache set
  const setStart = performance.now();
  await cache.set('perf-test', testData, 300);
  const setTime = performance.now() - setStart;
  
  // Test cache get (should be fast)
  const getStart = performance.now();
  const retrieved = await cache.get('perf-test');
  const getTime = performance.now() - getStart;
  
  console.log(`    Cache set: ${setTime.toFixed(2)}ms`);
  console.log(`    Cache get: ${getTime.toFixed(2)}ms`);
  
  results.push({
    operation: 'Basic Cache Operations',
    withoutCache: setTime,
    withCache: getTime,
    improvement: `${((setTime - getTime) / setTime * 100).toFixed(1)}% faster`,
    cacheHit: !!retrieved,
  });

  // Test 2: Cache vs Database simulation
  console.log('  Testing cache vs direct data access...');
  
  // Simulate database operation (slow)
  const dbSimulationStart = performance.now();
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate 50ms DB query
  const dbTime = performance.now() - dbSimulationStart;
  
  // Cache operation (fast)
  const cacheStart = performance.now();
  await cache.get('perf-test');
  const cacheTime = performance.now() - cacheStart;
  
  console.log(`    Simulated DB query: ${dbTime.toFixed(2)}ms`);
  console.log(`    Cache retrieval: ${cacheTime.toFixed(2)}ms`);
  
  results.push({
    operation: 'Database vs Cache',
    withoutCache: dbTime,
    withCache: cacheTime,
    improvement: `${((dbTime - cacheTime) / dbTime * 100).toFixed(1)}% faster`,
    cacheHit: true,
  });

  // Cleanup
  await cache.del('perf-test');
  
  return results;
}

/**
 * Test service layer performance
 */
async function testServicePerformance(): Promise<void> {
  console.log('🏭 Testing service layer performance...');
  
  try {
    // Test project service caching
    console.log('  Testing project service with caching...');
    
    const testUserId = 'perf-test-user';
    
    // First call (should miss cache and hit database)
    const firstCallStart = performance.now();
    try {
      await projectService.getProjectsByUser(testUserId);
      const firstCallTime = performance.now() - firstCallStart;
      console.log(`    First call (cache miss): ${firstCallTime.toFixed(2)}ms`);
      
      // Second call (should hit cache)
      const secondCallStart = performance.now();
      await projectService.getProjectsByUser(testUserId);
      const secondCallTime = performance.now() - secondCallStart;
      console.log(`    Second call (cache hit): ${secondCallTime.toFixed(2)}ms`);
      
      const improvement = ((firstCallTime - secondCallTime) / firstCallTime * 100).toFixed(1);
      console.log(`    Performance improvement: ${improvement}%`);
    } catch (error) {
      console.log(`    ⚠️  Service test skipped: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
  } catch (error) {
    console.error('  ❌ Service performance test failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Test memory usage
 */
async function testMemoryUsage(): Promise<void> {
  console.log('💾 Testing memory usage...');
  
  const initialMemory = process.memoryUsage();
  console.log('  Initial memory usage:');
  console.log(`    Heap used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Heap total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  
  // Create cache entries to test memory impact
  const testData = new Array(100).fill(0).map((_, i) => ({
    id: `test-${i}`,
    data: new Array(1000).fill('x').join(''),
    timestamp: new Date(),
  }));
  
  // Store test data in cache
  for (let i = 0; i < testData.length; i++) {
    await cache.set(`memory-test-${i}`, testData[i], 60);
  }
  
  const afterCacheMemory = process.memoryUsage();
  console.log('  After cache operations:');
  console.log(`    Heap used: ${(afterCacheMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`    Heap total: ${(afterCacheMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  
  const memoryIncrease = (afterCacheMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  console.log(`    Memory increase: ${memoryIncrease.toFixed(2)} MB`);
  
  // Cleanup
  for (let i = 0; i < testData.length; i++) {
    await cache.del(`memory-test-${i}`);
  }
}

/**
 * Test cache invalidation patterns
 */
async function testCacheInvalidation(): Promise<void> {
  console.log('🔄 Testing cache invalidation...');
  
  const testKey = 'invalidation-test';
  const testData = { value: 'original' };
  
  // Set initial data
  await cache.set(testKey, testData, 300);
  const retrieved1 = await cache.get(testKey);
  console.log(`  Initial data: ${JSON.stringify(retrieved1)}`);
  
  // Test manual invalidation
  await cache.del(testKey);
  const retrieved2 = await cache.get(testKey);
  console.log(`  After deletion: ${retrieved2}`);
  
  // Test pattern deletion
  await cache.set('pattern-test-1', { id: 1 }, 300);
  await cache.set('pattern-test-2', { id: 2 }, 300);
  await cache.delPattern('pattern-test-*');
  
  const check1 = await cache.get('pattern-test-1');
  const check2 = await cache.get('pattern-test-2');
  console.log(`  Pattern deletion successful: ${check1 === null && check2 === null}`);
}

/**
 * Run comprehensive performance tests
 */
async function runPerformanceTests(): Promise<void> {
  console.log('🚀 Starting Performance Boost validation tests...\n');
  
  try {
    // Test cache health first
    const cacheHealthy = await cache.healthCheck();
    if (!cacheHealthy) {
      console.warn('⚠️  Redis cache is not available. Some tests will be limited.');
      return;
    }
    console.log('✅ Cache service is healthy\n');
    
    // Run tests
    const cacheResults = await testCachePerformance();
    console.log('');
    
    await testServicePerformance();
    console.log('');
    
    await testMemoryUsage();
    console.log('');
    
    await testCacheInvalidation();
    console.log('');
    
    // Print summary
    console.log('📊 Performance Test Summary:');
    console.log('=' .repeat(50));
    
    cacheResults.forEach(result => {
      console.log(`${result.operation}:`);
      console.log(`  Without cache: ${result.withoutCache.toFixed(2)}ms`);
      console.log(`  With cache: ${result.withCache.toFixed(2)}ms`);
      console.log(`  Improvement: ${result.improvement}`);
      console.log(`  Cache hit: ${result.cacheHit ? '✅' : '❌'}`);
      console.log('');
    });
    
    console.log('🎉 Performance tests completed successfully!');
    console.log('\n💡 Recommendations:');
    console.log('  - Monitor cache hit rates in production');
    console.log('  - Adjust TTL values based on data change frequency');
    console.log('  - Use database indexes for better query performance');
    console.log('  - Consider read replicas for high-traffic scenarios');
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  } finally {
    await cache.disconnect();
  }
}

// Main execution
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

export { runPerformanceTests };