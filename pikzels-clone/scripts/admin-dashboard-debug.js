const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function debugAdminDashboard() {
  console.log('🎭 COMPREHENSIVE ADMIN DASHBOARD DEBUG');
  console.log('=====================================');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'admin-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Capture all console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    consoleLogs.push(logEntry);
    console.log(`🔍 [${msg.type().toUpperCase()}]`, msg.text());
  });
  
  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    const errorEntry = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    pageErrors.push(errorEntry);
    console.log('❌ PAGE ERROR:', error.message);
  });
  
  // Capture network failures
  const networkErrors = [];
  page.on('requestfailed', request => {
    const networkError = {
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText,
      timestamp: new Date().toISOString()
    };
    networkErrors.push(networkError);
    console.log('🌐 NETWORK FAILED:', request.url(), request.failure()?.errorText);
  });
  
  try {
    console.log('\n🔐 Phase 1: Authentication');
    console.log('-------------------------');
    
    // Navigate to login
    console.log('📍 Navigating to admin login...');
    await page.goto('http://localhost:8556/admin/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take login page screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '01-login-page.png'), 
      fullPage: true 
    });
    console.log('📸 Screenshot: 01-login-page.png');
    
    // Check if page loaded correctly
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Wait for form elements
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.waitForSelector('#password', { timeout: 10000 });
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });
    
    console.log('✅ Login form elements found');
    
    // Fill credentials
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'AdminPass123!');
    
    // Take screenshot before login
    await page.screenshot({ 
      path: path.join(screenshotsDir, '02-before-login.png'), 
      fullPage: true 
    });
    
    // Submit login
    console.log('🚀 Submitting login...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('✅ Login successful');
    
    console.log('\n🎨 Phase 2: Dashboard Routes Testing');
    console.log('------------------------------------');
    
    // Define all admin routes to test
    const adminRoutes = [
      { path: '/admin', name: 'Dashboard Home', description: 'Main admin dashboard' },
      { path: '/admin/users', name: 'User Management', description: 'User management interface' },
      { path: '/admin/sitemap', name: 'Sitemap Admin', description: 'Sitemap management' },
      { path: '/admin/analytics', name: 'Analytics', description: 'Analytics dashboard' },
      { path: '/admin/system/health', name: 'System Health', description: 'System monitoring' },
      { path: '/admin/system/logs', name: 'Audit Logs', description: 'System logs' },
      { path: '/admin/system/settings', name: 'Settings', description: 'System settings' }
    ];
    
    for (let i = 0; i < adminRoutes.length; i++) {
      const route = adminRoutes[i];
      const routeNumber = String(i + 3).padStart(2, '0');
      
      console.log(`\n📍 Testing Route ${i + 1}/${adminRoutes.length}: ${route.name}`);
      console.log(`   Path: ${route.path}`);
      console.log(`   Description: ${route.description}`);
      
      try {
        // Navigate to route
        await page.goto(`http://localhost:8556${route.path}`, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        // Wait for content to load
        await page.waitForTimeout(2000);
        
        // Take full page screenshot
        const screenshotName = `${routeNumber}-${route.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        await page.screenshot({ 
          path: path.join(screenshotsDir, screenshotName), 
          fullPage: true 
        });
        
        console.log(`   📸 Screenshot: ${screenshotName}`);
        
        // Analyze page content
        const pageAnalysis = await page.evaluate(() => {
          return {
            url: window.location.href,
            title: document.title,
            hasContent: document.body.children.length > 0,
            hasErrors: document.querySelector('[class*="error"], .error') !== null,
            hasLoading: document.querySelector('[class*="loading"], .loading, .spinner') !== null,
            hasH1: document.querySelector('h1') !== null,
            h1Text: document.querySelector('h1')?.textContent || 'No H1 found',
            elementCount: document.querySelectorAll('*').length,
            hasGradients: document.querySelectorAll('[class*="gradient"]').length,
            hasTailwind: document.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="p-"]').length > 10
          };
        });
        
        console.log(`   ✅ Page loaded successfully`);
        console.log(`   📊 Elements: ${pageAnalysis.elementCount}`);
        console.log(`   🎨 Gradients: ${pageAnalysis.hasGradients}`);
        console.log(`   🌊 Tailwind: ${pageAnalysis.hasTailwind ? 'Active' : 'Inactive'}`);
        console.log(`   📋 H1: ${pageAnalysis.h1Text}`);
        
        if (pageAnalysis.hasErrors) {
          console.log(`   ⚠️  Errors detected on page`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to load route: ${error.message}`);
        
        // Take error screenshot
        const errorScreenshotName = `${routeNumber}-${route.name.toLowerCase().replace(/\s+/g, '-')}-ERROR.png`;
        await page.screenshot({ 
          path: path.join(screenshotsDir, errorScreenshotName), 
          fullPage: true 
        });
        console.log(`   📸 Error screenshot: ${errorScreenshotName}`);
      }
    }
    
    console.log('\n🔍 Phase 3: Detailed Dashboard Analysis');
    console.log('--------------------------------------');
    
    // Go back to main dashboard for detailed analysis
    await page.goto('http://localhost:8556/admin', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Detailed dashboard analysis
    const detailedAnalysis = await page.evaluate(() => {
      const analysis = {
        sidebar: {
          present: document.querySelector('nav, .sidebar, [class*="sidebar"]') !== null,
          items: document.querySelectorAll('nav a, .sidebar a, [class*="nav"] a').length,
          logo: document.querySelector('[class*="logo"], .logo') !== null
        },
        metricCards: {
          total: document.querySelectorAll('[class*="card"], .card, [class*="metric"]').length,
          gradientCards: document.querySelectorAll('[class*="bg-gradient"]').length,
          colors: {
            blue: document.querySelectorAll('[class*="blue"]').length,
            purple: document.querySelectorAll('[class*="purple"], [class*="indigo"]').length,
            green: document.querySelectorAll('[class*="green"], [class*="emerald"]').length,
            cyan: document.querySelectorAll('[class*="cyan"]').length
          }
        },
        charts: {
          present: document.querySelector('canvas, svg, [class*="chart"]') !== null,
          count: document.querySelectorAll('canvas, svg, [class*="chart"]').length
        },
        styling: {
          tailwindClasses: document.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]').length,
          animations: document.querySelectorAll('[class*="animate"], [class*="transition"]').length,
          shadows: document.querySelectorAll('[class*="shadow"]').length,
          rounded: document.querySelectorAll('[class*="rounded"]').length
        },
        interactivity: {
          buttons: document.querySelectorAll('button').length,
          links: document.querySelectorAll('a').length,
          inputs: document.querySelectorAll('input, select, textarea').length
        }
      };
      
      return analysis;
    });
    
    console.log('\n📊 DETAILED ANALYSIS RESULTS:');
    console.log('=============================');
    console.log('🏠 Sidebar:');
    console.log(`   Present: ${detailedAnalysis.sidebar.present ? '✅' : '❌'}`);
    console.log(`   Navigation items: ${detailedAnalysis.sidebar.items}`);
    console.log(`   Logo: ${detailedAnalysis.sidebar.logo ? '✅' : '❌'}`);
    
    console.log('\n💳 Metric Cards:');
    console.log(`   Total cards: ${detailedAnalysis.metricCards.total}`);
    console.log(`   Gradient cards: ${detailedAnalysis.metricCards.gradientCards}`);
    console.log(`   Blue elements: ${detailedAnalysis.metricCards.colors.blue}`);
    console.log(`   Purple elements: ${detailedAnalysis.metricCards.colors.purple}`);
    console.log(`   Green elements: ${detailedAnalysis.metricCards.colors.green}`);
    console.log(`   Cyan elements: ${detailedAnalysis.metricCards.colors.cyan}`);
    
    console.log('\n📈 Charts:');
    console.log(`   Present: ${detailedAnalysis.charts.present ? '✅' : '❌'}`);
    console.log(`   Count: ${detailedAnalysis.charts.count}`);
    
    console.log('\n🎨 Styling:');
    console.log(`   Tailwind classes: ${detailedAnalysis.styling.tailwindClasses}`);
    console.log(`   Animations: ${detailedAnalysis.styling.animations}`);
    console.log(`   Shadows: ${detailedAnalysis.styling.shadows}`);
    console.log(`   Rounded corners: ${detailedAnalysis.styling.rounded}`);
    
    console.log('\n🖱️  Interactivity:');
    console.log(`   Buttons: ${detailedAnalysis.interactivity.buttons}`);
    console.log(`   Links: ${detailedAnalysis.interactivity.links}`);
    console.log(`   Form inputs: ${detailedAnalysis.interactivity.inputs}`);
    
    // Final comprehensive screenshot
    await page.screenshot({ 
      path: path.join(screenshotsDir, '99-final-dashboard-analysis.png'), 
      fullPage: true 
    });
    console.log('\n📸 Final comprehensive screenshot: 99-final-dashboard-analysis.png');
    
    console.log('\n⏰ Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Debug session failed:', error.message);
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'ERROR-debug-failure.png'), 
      fullPage: true 
    });
  } finally {
    // Generate comprehensive log report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalConsoleLogs: consoleLogs.length,
        totalPageErrors: pageErrors.length,
        totalNetworkErrors: networkErrors.length
      },
      consoleLogs,
      pageErrors,
      networkErrors
    };
    
    fs.writeFileSync(
      path.join(screenshotsDir, 'debug-report.json'), 
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📋 FINAL REPORT:');
    console.log('===============');
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log(`📊 Console logs: ${consoleLogs.length}`);
    console.log(`❌ Page errors: ${pageErrors.length}`);
    console.log(`🌐 Network errors: ${networkErrors.length}`);
    console.log(`📄 Full report: debug-report.json`);
    
    await browser.close();
    console.log('\n🏁 Debug session completed!');
  }
}

debugAdminDashboard().catch(console.error);