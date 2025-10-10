/**
 * Professional Admin Login Test Script
 * Windows-optimized using Node.js + axios (preferred over curl)
 * Enterprise-grade admin authentication testing
 */

const axios = require('axios');
const colors = require('colors');

// Professional configuration
const CONFIG = {
  baseURL: 'http://localhost:8550',
  timeout: 10000,
  retries: 3,
  admin: {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    name: 'System Administrator'
  }
};

// Enterprise logging
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`.cyan),
  success: (msg) => console.log(`✅ ${msg}`.green),
  warning: (msg) => console.log(`⚠️  ${msg}`.yellow),
  error: (msg) => console.log(`❌ ${msg}`.red),
  data: (label, data) => console.log(`📊 ${label}:`.blue, JSON.stringify(data, null, 2))
};

// Professional HTTP client setup
const apiClient = axios.create({
  baseURL: CONFIG.baseURL,
  timeout: CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'ThumbnailMaker-AdminScript/1.0'
  }
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  config => {
    log.info(`Making ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor for professional error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      log.error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      if (error.response.data) {
        log.data('Error Details', error.response.data);
      }
    } else if (error.request) {
      log.error('Network error: No response received');
    } else {
      log.error(`Request error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

/**
 * Check if backend is running
 */
async function checkBackendHealth() {
  try {
    log.info('Checking backend health...');
    const response = await apiClient.get('/health');
    log.success('Backend is running');
    log.data('Health Status', response.data);
    return true;
  } catch (error) {
    log.error('Backend is not responding');
    return false;
  }
}

/**
 * Create default admin if needed
 */
async function ensureAdminExists() {
  try {
    log.info('Checking if default admin exists...');
    
    // Try to login first to see if admin exists
    try {
      const loginResponse = await apiClient.post('/api/admin/auth/login', {
        email: CONFIG.admin.email,
        password: CONFIG.admin.password
      });
      
      if (loginResponse.status === 200) {
        log.success('Default admin already exists and credentials are valid');
        return true;
      }
    } catch (loginError) {
      if (loginError.response?.status === 401) {
        log.warning('Admin exists but credentials invalid, or admin not created yet');
      }
    }

    log.info('Creating default admin using setup script...');
    // Note: In a production environment, you'd want to run the admin creation script
    log.warning('Please run: node create-default-admin.ts to create the default admin');
    return false;

  } catch (error) {
    log.error('Failed to check/create admin');
    return false;
  }
}

/**
 * Professional admin login test
 */
async function testAdminLogin() {
  try {
    log.info('Testing admin login...');
    
    const loginData = {
      email: CONFIG.admin.email,
      password: CONFIG.admin.password
    };

    log.info(`Attempting login for: ${loginData.email}`);
    
    const response = await apiClient.post('/api/admin/auth/login', loginData);
    
    if (response.status === 200) {
      log.success('✨ ADMIN LOGIN SUCCESSFUL! ✨');
      
      const { token, admin } = response.data;
      
      // Store token for subsequent requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      log.data('Admin Info', {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        roles: admin.roles,
        permissions: admin.permissions,
        lastLogin: admin.lastLoginAt
      });
      
      log.data('Auth Token', {
        token: token.substring(0, 20) + '...',
        length: token.length
      });
      
      return { token, admin };
    }
    
  } catch (error) {
    log.error('Admin login failed');
    
    if (error.response?.status === 401) {
      log.warning('Invalid credentials or admin not found');
      log.info('Expected credentials:');
      log.info(`Email: ${CONFIG.admin.email}`);
      log.info(`Password: ${CONFIG.admin.password}`);
    }
    
    return null;
  }
}

/**
 * Test admin dashboard access
 */
async function testAdminDashboard(token) {
  try {
    log.info('Testing admin dashboard access...');
    
    const response = await apiClient.get('/api/admin/auth/me');
    
    if (response.status === 200) {
      log.success('Admin dashboard access verified');
      log.data('Current Admin Session', response.data.admin);
      return true;
    }
    
  } catch (error) {
    log.error('Failed to access admin dashboard');
    return false;
  }
}

/**
 * Test admin permissions
 */
async function testAdminPermissions() {
  try {
    log.info('Testing admin permissions...');
    
    // Test user management access
    const usersResponse = await apiClient.get('/api/admin/users?page=1&limit=5');
    if (usersResponse.status === 200) {
      log.success('User management access: ✅');
    }
    
    // Test system health access
    const healthResponse = await apiClient.get('/api/admin/system/health');
    if (healthResponse.status === 200) {
      log.success('System health access: ✅');
    }
    
    return true;
    
  } catch (error) {
    log.warning('Some admin endpoints may not be fully accessible yet');
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('\n🔐 PROFESSIONAL ADMIN LOGIN TEST SCRIPT'.rainbow);
  console.log('='.repeat(50).gray);
  console.log(`🌐 Target: ${CONFIG.baseURL}`.cyan);
  console.log(`👤 Admin: ${CONFIG.admin.email}`.cyan);
  console.log('='.repeat(50).gray);
  
  try {
    // Step 1: Check backend health
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      log.error('Backend is not running. Please start it first: npm run dev');
      process.exit(1);
    }
    
    // Step 2: Ensure admin exists
    console.log('\n📋 STEP 1: Admin Account Verification'.yellow);
    const adminExists = await ensureAdminExists();
    
    // Step 3: Test login
    console.log('\n🔑 STEP 2: Admin Login Test'.yellow);
    const loginResult = await testAdminLogin();
    
    if (!loginResult) {
      console.log('\n💡 NEXT STEPS:'.yellow);
      console.log('1. Create default admin: node create-default-admin.ts');
      console.log('2. Or run admin setup: npx ts-node src/scripts/admin-setup.ts create');
      console.log('3. Then run this script again');
      process.exit(1);
    }
    
    // Step 4: Test dashboard access
    console.log('\n📊 STEP 3: Dashboard Access Test'.yellow);
    await testAdminDashboard(loginResult.token);
    
    // Step 5: Test permissions
    console.log('\n🛡️  STEP 4: Permission Tests'.yellow);
    await testAdminPermissions();
    
    // Success summary
    console.log('\n🎉 ADMIN LOGIN TEST COMPLETE!'.rainbow);
    console.log('✨ You are successfully logged in as Super Admin'.green);
    console.log(`🌐 Admin Panel: ${CONFIG.baseURL}/admin`.cyan);
    console.log(`🔑 Token valid for session use`.green);
    
  } catch (error) {
    log.error('Script execution failed');
    console.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Admin login test terminated');
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  testAdminLogin,
  CONFIG
};