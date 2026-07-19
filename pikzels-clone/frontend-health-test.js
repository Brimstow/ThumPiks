#!/usr/bin/env node

/**
 * Frontend Health Test - Enhanced Frontend Service Monitoring
 * 
 * Tests various aspects of frontend service health including:
 * - Port availability and response
 * - React app loading status
 * - Build status and hot reload
 * - Asset loading and routing
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

class FrontendHealthTester {
  constructor() {
    this.frontendPort = 8556;
    this.frontendUrl = `http://localhost:${this.frontendPort}`;
    this.timeout = 10000; // 10 second timeout
  }

  async runAllTests() {
    console.log('🔍 Frontend Health Comprehensive Test');
    console.log('=====================================\n');

    const results = {
      portCheck: await this.testPortAvailability(),
      httpResponse: await this.testHttpResponse(),
      reactApp: await this.testReactAppLoading(),
      routing: await this.testRouting(),
      assets: await this.testAssetLoading(),
      viteStatus: await this.testViteDevServer(),
      processInfo: await this.getProcessInfo()
    };

    this.printSummary(results);
    return results;
  }

  /**
   * Test if the frontend port is available and responding
   */
  async testPortAvailability() {
    console.log('📡 Testing Frontend Port Availability...');
    
    try {
      const { stdout } = await execAsync(`netstat -an | findstr :${this.frontendPort}`);
      
      if (stdout.includes('LISTENING')) {
        console.log(`✅ Port ${this.frontendPort} is listening`);
        return { status: 'listening', details: stdout.trim() };
      } else if (stdout.trim()) {
        console.log(`⚠️  Port ${this.frontendPort} has connections but may not be listening`);
        return { status: 'connections', details: stdout.trim() };
      } else {
        console.log(`❌ No activity on port ${this.frontendPort}`);
        return { status: 'no_activity', details: null };
      }
    } catch (error) {
      console.log(`❌ Error checking port: ${error.message}`);
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Test HTTP response from frontend service
   */
  async testHttpResponse() {
    console.log('\n🌐 Testing HTTP Response...');
    
    try {
      const response = await axios.get(this.frontendUrl, {
        timeout: this.timeout,
        validateStatus: (status) => status < 500 // Accept redirects and client errors
      });

      console.log(`✅ HTTP Response: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Length: ${response.headers['content-length'] || 'unknown'}`);

      return {
        status: 'success',
        httpStatus: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        responseTime: response.headers['response-time']
      };

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Connection refused - Frontend not responding on port ${this.frontendPort}`);
        return { status: 'connection_refused', details: error.message };
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ Request timeout - Frontend taking too long to respond`);
        return { status: 'timeout', details: error.message };
      } else {
        console.log(`❌ HTTP Error: ${error.message}`);
        return { status: 'error', details: error.message };
      }
    }
  }

  /**
   * Test if React app is loading properly
   */
  async testReactAppLoading() {
    console.log('\n⚛️  Testing React App Loading...');
    
    try {
      const response = await axios.get(this.frontendUrl, {
        timeout: this.timeout
      });

      const html = response.data;
      
      // Check for React app indicators
      const hasReactRoot = html.includes('id="root"') || html.includes('id="app"');
      const hasReactScript = html.includes('react') || html.includes('/_react_refresh');
      const hasViteScript = html.includes('@vite') || html.includes('vite/client');
      const hasTitle = /<title[^>]*>/.test(html);

      if (hasReactRoot && (hasReactScript || hasViteScript)) {
        console.log('✅ React app structure detected');
        console.log(`   Root element: ${hasReactRoot ? '✅' : '❌'}`);
        console.log(`   React scripts: ${hasReactScript ? '✅' : '❌'}`);
        console.log(`   Vite scripts: ${hasViteScript ? '✅' : '❌'}`);
        console.log(`   Page title: ${hasTitle ? '✅' : '❌'}`);

        return {
          status: 'healthy',
          hasReactRoot,
          hasReactScript,
          hasViteScript,
          hasTitle,
          htmlLength: html.length
        };
      } else {
        console.log('⚠️  React app may not be loading properly');
        return {
          status: 'suspect',
          hasReactRoot,
          hasReactScript,
          hasViteScript,
          hasTitle,
          htmlLength: html.length
        };
      }

    } catch (error) {
      console.log(`❌ Cannot test React app: ${error.message}`);
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Test frontend routing
   */
  async testRouting() {
    console.log('\n🛣️  Testing Frontend Routing...');
    
    const routes = ['/', '/login', '/admin', '/dashboard'];
    const routeResults = {};

    for (const route of routes) {
      try {
        const response = await axios.get(`${this.frontendUrl}${route}`, {
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        routeResults[route] = {
          status: response.status,
          success: response.status < 400
        };

        console.log(`   ${route}: ${response.status} ${response.status < 400 ? '✅' : '⚠️'}`);

      } catch (error) {
        routeResults[route] = {
          status: 'error',
          success: false,
          error: error.code
        };
        console.log(`   ${route}: Error (${error.code}) ❌`);
      }
    }

    const successfulRoutes = Object.values(routeResults).filter(r => r.success).length;
    
    if (successfulRoutes > 0) {
      console.log(`✅ ${successfulRoutes}/${routes.length} routes accessible`);
      return { status: 'partial_success', routes: routeResults, successCount: successfulRoutes };
    } else {
      console.log(`❌ No routes accessible`);
      return { status: 'failed', routes: routeResults, successCount: 0 };
    }
  }

  /**
   * Test asset loading (CSS, JS, etc.)
   */
  async testAssetLoading() {
    console.log('\n🎨 Testing Asset Loading...');
    
    try {
      const response = await axios.get(this.frontendUrl, { timeout: this.timeout });
      const html = response.data;
      
      // Extract asset URLs
      const cssLinks = html.match(/<link[^>]*href="[^"]*\.css[^"]*"/g) || [];
      const jsScripts = html.match(/<script[^>]*src="[^"]*\.js[^"]*"/g) || [];
      
      console.log(`   Found ${cssLinks.length} CSS links`);
      console.log(`   Found ${jsScripts.length} JS scripts`);

      // Test first few assets
      const assetTests = [];
      const allAssets = [
        ...cssLinks.map(link => link.match(/href="([^"]*)"/)?.[1]).filter(Boolean),
        ...jsScripts.map(script => script.match(/src="([^"]*)"/)?.[1]).filter(Boolean)
      ].slice(0, 3); // Test first 3 assets

      for (const assetUrl of allAssets) {
        try {
          const fullUrl = assetUrl.startsWith('http') ? assetUrl : `${this.frontendUrl}${assetUrl}`;
          const assetResponse = await axios.head(fullUrl, { timeout: 3000 });
          assetTests.push({ url: assetUrl, status: assetResponse.status, success: true });
          console.log(`   ${assetUrl}: ${assetResponse.status} ✅`);
        } catch (error) {
          assetTests.push({ url: assetUrl, status: 'error', success: false, error: error.code });
          console.log(`   ${assetUrl}: Error (${error.code}) ❌`);
        }
      }

      return {
        status: 'tested',
        cssCount: cssLinks.length,
        jsCount: jsScripts.length,
        testedAssets: assetTests.length,
        successfulAssets: assetTests.filter(a => a.success).length
      };

    } catch (error) {
      console.log(`❌ Cannot test assets: ${error.message}`);
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Test Vite dev server specific features
   */
  async testViteDevServer() {
    console.log('\n🔥 Testing Vite Dev Server...');
    
    try {
      // Test Vite client endpoint
      const viteClientUrl = `${this.frontendUrl}/@vite/client`;
      const clientResponse = await axios.get(viteClientUrl, { timeout: 5000 });
      
      console.log('✅ Vite client endpoint accessible');
      
      // Check for HMR (Hot Module Replacement) capability
      const clientCode = clientResponse.data;
      const hasHMR = clientCode.includes('hot') && clientCode.includes('update');
      
      console.log(`   Hot Module Replacement: ${hasHMR ? '✅ Active' : '⚠️  Unknown'}`);
      
      return {
        status: 'healthy',
        viteClientAccessible: true,
        hmrCapable: hasHMR,
        clientCodeLength: clientCode.length
      };

    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️  Vite client endpoint not found (may not be Vite)');
        return { status: 'not_vite', details: 'Vite client endpoint not accessible' };
      } else {
        console.log(`❌ Vite test error: ${error.message}`);
        return { status: 'error', details: error.message };
      }
    }
  }

  /**
   * Get detailed process information
   */
  async getProcessInfo() {
    console.log('\n🔍 Getting Process Information...');
    
    try {
      // Find processes using the frontend port
      const { stdout } = await execAsync(`netstat -ano | findstr :${this.frontendPort}`);
      
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        const processes = [];
        
        for (const line of lines) {
          const match = line.match(/\s+(\d+)\s*$/);
          if (match) {
            const pid = match[1];
            try {
              const { stdout: processInfo } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
              const processLines = processInfo.split('\n');
              if (processLines.length > 1) {
                const processData = processLines[1].split(',').map(s => s.replace(/"/g, ''));
                processes.push({
                  pid: pid,
                  name: processData[0],
                  memory: processData[4]
                });
              }
            } catch (processError) {
              processes.push({ pid: pid, name: 'Unknown', error: processError.message });
            }
          }
        }

        console.log(`✅ Found ${processes.length} process(es) using port ${this.frontendPort}:`);
        processes.forEach(proc => {
          console.log(`   PID ${proc.pid}: ${proc.name} ${proc.memory ? `(${proc.memory})` : ''}`);
        });

        return { status: 'found', processes };

      } else {
        console.log(`❌ No processes found using port ${this.frontendPort}`);
        return { status: 'none_found', processes: [] };
      }

    } catch (error) {
      console.log(`❌ Error getting process info: ${error.message}`);
      return { status: 'error', details: error.message };
    }
  }

  /**
   * Print comprehensive test summary
   */
  printSummary(results) {
    console.log('\n📊 Frontend Health Test Summary');
    console.log('================================\n');

    // Overall health score
    let healthScore = 0;
    let maxScore = 0;

    // Port check (20 points)
    maxScore += 20;
    if (results.portCheck.status === 'listening') healthScore += 20;
    else if (results.portCheck.status === 'connections') healthScore += 10;

    // HTTP response (25 points)
    maxScore += 25;
    if (results.httpResponse.status === 'success') healthScore += 25;
    else if (results.httpResponse.status === 'timeout') healthScore += 5;

    // React app loading (25 points)
    maxScore += 25;
    if (results.reactApp.status === 'healthy') healthScore += 25;
    else if (results.reactApp.status === 'suspect') healthScore += 10;

    // Routing (15 points)
    maxScore += 15;
    if (results.routing.status === 'partial_success') {
      healthScore += Math.round((results.routing.successCount / 4) * 15);
    }

    // Assets (10 points)
    maxScore += 10;
    if (results.assets.status === 'tested' && results.assets.successfulAssets > 0) {
      healthScore += Math.round((results.assets.successfulAssets / results.assets.testedAssets) * 10);
    }

    // Vite (5 points)
    maxScore += 5;
    if (results.viteStatus.status === 'healthy') healthScore += 5;

    const healthPercentage = Math.round((healthScore / maxScore) * 100);

    console.log(`🎯 Overall Health Score: ${healthScore}/${maxScore} (${healthPercentage}%)`);
    
    if (healthPercentage >= 80) {
      console.log('💚 Frontend Status: HEALTHY');
    } else if (healthPercentage >= 60) {
      console.log('💛 Frontend Status: DEGRADED');
    } else if (healthPercentage >= 30) {
      console.log('🧡 Frontend Status: UNHEALTHY');
    } else {
      console.log('❤️  Frontend Status: CRITICAL');
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (results.portCheck.status !== 'listening') {
      console.log('   • Start the frontend development server: cd client && npm run dev');
    }
    if (results.httpResponse.status !== 'success') {
      console.log('   • Check if Vite dev server is running properly');
    }
    if (results.reactApp.status !== 'healthy') {
      console.log('   • Verify React app is building without errors');
    }
    if (results.routing.successCount === 0) {
      console.log('   • Check React Router configuration');
    }
    if (results.processInfo.processes && results.processInfo.processes.length === 0) {
      console.log('   • No process found using the frontend port - service may be down');
    }

    console.log('\n🚀 Quick Start Commands:');
    console.log('   • Start frontend: cd client && npm run dev');
    console.log('   • Start monitoring: npm run monitor:start');
    console.log('   • Full restart: npm run dev:restart');
  }
}

// CLI interface
async function main() {
  const tester = new FrontendHealthTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { FrontendHealthTester };