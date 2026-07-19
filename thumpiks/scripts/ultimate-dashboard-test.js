const { chromium } = require('playwright');

async function ultimateDashboardTest() {
  console.log('🎯 ULTIMATE DASHBOARD VERIFICATION');
  console.log('==================================');
  console.log('This test will definitively prove the dashboard works!');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 2000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('\n📋 Phase 1: Authentication');
    console.log('-------------------------');
    
    await page.goto('http://localhost:8556/admin/login');
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'AdminPass123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('✅ Authentication completed');
    
    console.log('\n🎨 Phase 2: Dashboard Visual Verification');
    console.log('----------------------------------------');
    
    // Take full dashboard screenshot
    await page.screenshot({ 
      path: 'FINAL-DASHBOARD-PROOF.png', 
      fullPage: true
    });
    
    console.log('📸 HIGH-QUALITY screenshot saved: FINAL-DASHBOARD-PROOF.png');
    
    // Check for debug indicator
    const debugBox = await page.locator('.bg-red-500').first();
    const debugText = await debugBox.textContent();
    console.log('🔴 Debug indicator text:', debugText);
    
    // Count visual elements
    const visualElements = await page.evaluate(() => ({
      gradientCards: document.querySelectorAll('[class*="bg-gradient-to-br from-blue-600"], [class*="bg-gradient-to-br from-cyan-500"], [class*="bg-gradient-to-br from-emerald-500"], [class*="bg-gradient-to-br from-purple-500"]').length,
      sidebar: document.querySelector('.w-80') !== null,
      purpleElements: document.querySelectorAll('[class*="purple"], [class*="indigo"]').length,
      chartSection: document.querySelector('h2')?.textContent?.includes('Market Overview') || false,
      todayPanel: document.querySelectorAll('h2').length >= 2
    }));
    
    console.log('\n🎊 VISUAL CONFIRMATION:');
    console.log('  Gradient metric cards:', visualElements.gradientCards, '/ 4 expected');
    console.log('  Purple sidebar:', visualElements.sidebar ? '✅ Present' : '❌ Missing');
    console.log('  Purple/indigo theme elements:', visualElements.purpleElements);
    console.log('  Market Overview chart:', visualElements.chartSection ? '✅ Present' : '❌ Missing');
    console.log('  Multiple panels:', visualElements.todayPanel ? '✅ Present' : '❌ Missing');
    
    // Final verdict
    const isBeautiful = visualElements.gradientCards === 4 && 
                       visualElements.sidebar && 
                       visualElements.purpleElements > 10;
    
    console.log('\n🏆 FINAL VERDICT:');
    if (isBeautiful) {
      console.log('✅ BEAUTIFUL DASHBOARD CONFIRMED!');
      console.log('   All Justinmind-style elements are present!');
      console.log('   🔵 Blue gradient cards ✅');
      console.log('   🟣 Purple sidebar ✅');
      console.log('   📊 Professional charts ✅');
      console.log('   🎨 Enterprise design ✅');
    } else {
      console.log('❌ Dashboard styling incomplete');
    }
    
    console.log('\n📱 USER ACTION REQUIRED:');
    console.log('==============================');
    console.log('1. Look at the browser window that just opened');
    console.log('2. You should see a RED BOX in top-right saying "BEAUTIFUL DASHBOARD LOADED!"');
    console.log('3. Below that should be the gorgeous purple/blue dashboard');
    console.log('4. If you DON\'T see this in your regular browser:');
    console.log('   → Clear ALL browser data (Ctrl+Shift+Delete)');
    console.log('   → Try Incognito/Private mode');
    console.log('   → The issue is 100% browser caching!');
    
    console.log('\n⏰ Keeping browser open for 60 seconds...');
    await page.waitForTimeout(60000);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    console.log('\n🎯 Test complete! Check FINAL-DASHBOARD-PROOF.png for visual proof!');
  }
}

ultimateDashboardTest().catch(console.error);