const { chromium } = require('playwright');

async function testDashboardLogin() {
  console.log('🎭 PLAYWRIGHT DASHBOARD LOGIN TEST');
  console.log('================================');
  
  const browser = await chromium.launch({ 
    headless: false,  // Show browser for visual feedback
    slowMo: 1000      // Slow down for visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🌐 Navigating to admin login...');
    await page.goto('http://localhost:8556/admin/login');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'login-page.png', fullPage: true });
    console.log('📸 Login page screenshot saved as login-page.png');
    
    // Check what's on the page
    const pageContent = await page.content();
    console.log('📝 Page title:', await page.title());
    console.log('🌐 Current URL:', page.url());
    
    // Check for form elements
    const emailInput = await page.$('#email');
    const passwordInput = await page.$('#password');
    const submitButton = await page.$('button[type="submit"]');
    
    console.log('📝 Form elements found:');
    console.log('  Email input:', emailInput ? 'Found' : 'Not found');
    console.log('  Password input:', passwordInput ? 'Found' : 'Not found');
    console.log('  Submit button:', submitButton ? 'Found' : 'Not found');
    
    if (emailInput && passwordInput && submitButton) {
      console.log('📝 Filling login form...');
      await page.fill('#email', 'admin@example.com');
      await page.waitForTimeout(500);
      
      await page.fill('#password', 'AdminPass123!');
      await page.waitForTimeout(500);
      
      console.log('🔐 Submitting login...');
      await page.click('button[type="submit"]');
      
      // Wait for navigation or dashboard load
      await page.waitForTimeout(5000);
      
      console.log('📊 Analyzing dashboard...');
      
      // Take screenshot
      await page.screenshot({ path: 'current-dashboard.png', fullPage: true });
      console.log('📸 Screenshot saved as current-dashboard.png');
      
      // Get current URL
      const currentUrl = page.url();
      console.log(`🌐 Current URL: ${currentUrl}`);
      
      if (currentUrl.includes('/admin') && !currentUrl.includes('/login')) {
        console.log('✅ Successfully logged in and reached dashboard!');
        
        // Check dashboard elements
        const title = await page.textContent('h1').catch(() => 'Not found');
        console.log(`📋 Dashboard title: ${title}`);
        
        // Check for metric cards
        const cards = await page.$$('.bg-gradient-to-br');
        console.log(`📊 Found ${cards.length} gradient metric cards`);
        
        // Check for charts
        const charts = await page.$$('canvas, svg, .chart, .graph');
        console.log(`📈 Found ${charts.length} chart elements`);
        
      } else {
        console.log('❌ Login failed or still on login page');
      }
    } else {
      console.log('❌ Login form elements not found. Page may not have loaded correctly.');
    }
    
    // Keep browser open for manual inspection
    console.log('⏸️  Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'error-dashboard.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testDashboardLogin().catch(console.error);