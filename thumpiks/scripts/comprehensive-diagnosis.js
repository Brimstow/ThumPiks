const axios = require('axios');

async function comprehensiveDiagnosis() {
  console.log('🔬 COMPREHENSIVE DASHBOARD DIAGNOSIS');
  console.log('===================================');
  
  // Phase 1: Check build outputs
  console.log('\\n📦 Phase 1: Build & Bundle Analysis');
  console.log('-----------------------------------');
  
  try {
    // Check if frontend is actually serving the right files
    const indexResponse = await axios.get('http://localhost:8556/', { timeout: 5000 });
    console.log('✅ Frontend index.html loads:', indexResponse.status);
    
    // Check for React errors in the build
    const hasReactErrorIndicators = indexResponse.data.includes('Error') || 
                                   indexResponse.data.includes('error') ||
                                   indexResponse.data.includes('Cannot resolve');
    console.log('🔍 Build errors in HTML:', hasReactErrorIndicators ? '❌ YES' : '✅ NO');
    
    // Check if Vite is serving files correctly
    const viteAssets = indexResponse.data.includes('src="/') ? 'YES' : 'NO';
    console.log('📁 Vite assets loading:', viteAssets);
    
  } catch (error) {
    console.log('❌ Frontend server issue:', error.message);
  }
  
  // Phase 2: Check CSS framework loading
  console.log('\\n🎨 Phase 2: CSS Framework Check');
  console.log('--------------------------------');
  
  try {
    // Try to access a Tailwind CSS file or check if it's inlined
    const cssResponse = await axios.get('http://localhost:8556/src/index.css', { 
      timeout: 3000,
      validateStatus: () => true 
    });
    console.log('🎨 CSS file status:', cssResponse.status);
    
    // Check if Tailwind is working
    if (cssResponse.data && typeof cssResponse.data === 'string') {
      const hasTailwind = cssResponse.data.includes('tailwind') || 
                         cssResponse.data.includes('@apply') ||
                         cssResponse.data.includes('bg-gradient');
      console.log('🌊 Tailwind CSS detected:', hasTailwind ? '✅ YES' : '❌ NO');
    }
    
  } catch (error) {
    console.log('⚠️  CSS check inconclusive:', error.message);
  }
  
  // Phase 3: API Integration Test
  console.log('\\n🌐 Phase 3: API Integration');
  console.log('----------------------------');
  
  try {
    // Test backend health
    const healthResponse = await axios.get('http://localhost:8550/health');
    console.log('🏥 Backend health:', healthResponse.status);
    
    // Test admin login API
    const loginResponse = await axios.post('http://localhost:8550/api/admin/auth/login', {
      email: 'admin@example.com',
      password: 'AdminPass123!'
    });
    console.log('🔐 Admin login API:', loginResponse.status);
    console.log('🎫 Token received:', loginResponse.data.token ? 'YES' : 'NO');
    
  } catch (error) {
    console.log('❌ API test failed:', error.response?.status || error.message);
  }
  
  // Phase 4: Component Loading Test
  console.log('\\n⚛️  Phase 4: React Component Analysis');
  console.log('-------------------------------------');
  
  try {
    // Check if React DevTools are detecting components
    const mainResponse = await axios.get('http://localhost:8556/admin', {
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (mainResponse.status === 200) {
      console.log('📄 Admin route accessible:', mainResponse.status);
      
      // Look for React component signatures in HTML
      const hasReactRoot = mainResponse.data.includes('id="root"');
      const hasReactScript = mainResponse.data.includes('react') || mainResponse.data.includes('React');
      const hasViteClient = mainResponse.data.includes('vite/client');
      
      console.log('🔗 React root element:', hasReactRoot ? '✅ YES' : '❌ NO');
      console.log('⚛️  React scripts:', hasReactScript ? '✅ YES' : '❌ NO');
      console.log('⚡ Vite client:', hasViteClient ? '✅ YES' : '❌ NO');
      
    } else {
      console.log('❌ Admin route status:', mainResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Component check failed:', error.message);
  }
  
  console.log('\\n📊 DIAGNOSIS SUMMARY');
  console.log('===================');
  console.log('If all above checks pass but you still see plain styling:');
  console.log('1. 🎨 CSS framework not loading properly');
  console.log('2. ⚛️  React component mounting issues');
  console.log('3. 📦 Build/bundle mismatch');
  console.log('4. 🔧 Development server vs production build difference');
  
  return true;
}

comprehensiveDiagnosis().catch(console.error);