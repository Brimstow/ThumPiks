const { chromium } = require('playwright');
const fs = require('fs');

async function scrapeDashboardExamples() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Navigating to dashboard examples...');
    await page.goto('https://www.justinmind.com/ui-design/dashboard-design-best-practices-ux#awesome-dashboard-examples-for-inspiration', {
      waitUntil: 'networkidle'
    });
    
    // Wait for images to load
    await page.waitForTimeout(3000);
    
    // Extract dashboard design insights
    const dashboardInsights = await page.evaluate(() => {
      const insights = [];
      
      // Look for dashboard example images and descriptions
      const images = document.querySelectorAll('img[src*="dashboard"], img[src*="examples"]');
      const sections = document.querySelectorAll('h3, h4');
      
      // Extract design principles from the text
      const designPrinciples = [];
      const paragraphs = document.querySelectorAll('p');
      
      paragraphs.forEach(p => {
        const text = p.textContent;
        if (text.includes('dashboard') && (text.includes('design') || text.includes('layout') || text.includes('color') || text.includes('visual'))) {
          designPrinciples.push(text.substring(0, 200) + '...');
        }
      });
      
      // Extract specific dashboard examples
      sections.forEach(section => {
        const text = section.textContent;
        if (text.includes('dashboard') || text.includes('navigation') || text.includes('sales') || text.includes('template')) {
          const nextElement = section.nextElementSibling;
          let description = '';
          if (nextElement && nextElement.tagName === 'P') {
            description = nextElement.textContent.substring(0, 300) + '...';
          }
          
          insights.push({
            title: text,
            description: description,
            type: 'example'
          });
        }
      });
      
      return {
        insights,
        designPrinciples: designPrinciples.slice(0, 10),
        totalImages: images.length
      };
    });
    
    console.log('📊 Dashboard Design Insights Extracted:');
    console.log('Total Images Found:', dashboardInsights.totalImages);
    console.log('Design Examples:', dashboardInsights.insights.length);
    console.log('Design Principles:', dashboardInsights.designPrinciples.length);
    
    // Save insights to file
    fs.writeFileSync('dashboard-insights.json', JSON.stringify(dashboardInsights, null, 2));
    console.log('💾 Insights saved to dashboard-insights.json');
    
    return dashboardInsights;
    
  } catch (error) {
    console.error('❌ Error scraping dashboard examples:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeDashboardExamples().then(insights => {
  if (insights) {
    console.log('\\n🎨 Key Design Patterns Found:');
    insights.insights.slice(0, 5).forEach((insight, index) => {
      console.log(`${index + 1}. ${insight.title}`);
      console.log(`   ${insight.description}\\n`);
    });
  }
});