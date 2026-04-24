#!/usr/bin/env node

/**
 * Comprehensive Service Detection Utility
 * Detects PostgreSQL, Redis, Backend, and Frontend services before startup
 */

const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const execAsync = util.promisify(exec);

const SERVICE_CONFIG = {
  POSTGRESQL_PORT: 8565,
  REDIS_PORT: 8520,
  BACKEND_PORT: 8550,
  FRONTEND_PORT: 8556,
  HEALTH_CHECK_TIMEOUT: 3000,
  // B drive installation paths (following WARP-RULES.md)
  POSTGRES_PATH: 'B:\\Thumbnail_maker\\database\\postgresql\\bin\\pg_ctl.exe',
  POSTGRES_DATA_DIR: 'B:\\Thumbnail_maker\\database\\postgresql\\data',
  REDIS_PATH: 'B:\\Thumbnail_maker\\database\\redis\\redis-server.exe',
  // Port range enforcement: ALL ports must be in 8500-8599 range
  PORT_RANGE: { min: 8500, max: 8599 }
};

console.log('🔍 Service Detection Utility');
console.log('============================\n');

class ServiceDetector {
  constructor() {
    this.services = {
      postgresql: { port: SERVICE_CONFIG.POSTGRESQL_PORT, running: false, pid: null },
      redis: { port: SERVICE_CONFIG.REDIS_PORT, running: false, pid: null },
      backend: { port: SERVICE_CONFIG.BACKEND_PORT, running: false, pid: null },
      frontend: { port: SERVICE_CONFIG.FRONTEND_PORT, running: false, pid: null }
    };
    
    // Validate all ports are within the required range
    this.validatePortRange();
  }

  /**
   * Validate all configured ports are within the required range (8500-8599)
   */
  validatePortRange() {
    for (const [service, config] of Object.entries(this.services)) {
      const port = config.port;
      if (port < SERVICE_CONFIG.PORT_RANGE.min || port > SERVICE_CONFIG.PORT_RANGE.max) {
        throw new Error(
          `❌ PORT RANGE VIOLATION: ${service.toUpperCase()} port ${port} is outside required range ${SERVICE_CONFIG.PORT_RANGE.min}-${SERVICE_CONFIG.PORT_RANGE.max}`
        );
      }
    }
    console.log('✅ All configured ports comply with range 8500-8599');
  }

  /**
   * Check if a specific port is in use
   */
  async isPortInUse(port) {
    try {
      const { stdout } = await execAsync(`netstat -an | findstr :${port}`);
      const lines = stdout.trim().split('\n');
      
      for (const line of lines) {
        if (line.includes(`127.0.0.1:${port}`) || line.includes(`localhost:${port}`) || line.includes(`0.0.0.0:${port}`)) {
          // Extract PID if possible
          try {
            const { stdout: pidOutput } = await execAsync(`netstat -ano | findstr :${port}`);
            const pidMatch = pidOutput.match(/\s+(\d+)\s*$/m);
            return {
              inUse: true,
              pid: pidMatch ? pidMatch[1] : null,
              connection: line.trim()
            };
          } catch {
            return { inUse: true, pid: null, connection: line.trim() };
          }
        }
      }
      return { inUse: false, pid: null, connection: null };
    } catch (error) {
      return { inUse: false, pid: null, connection: null };
    }
  }

  /**
   * Check PostgreSQL service specifically
   */
  async checkPostgreSQL() {
    console.log(`🐘 Checking PostgreSQL on port ${SERVICE_CONFIG.POSTGRESQL_PORT}...`);
    
    const portCheck = await this.isPortInUse(SERVICE_CONFIG.POSTGRESQL_PORT);
    
    if (portCheck.inUse) {
      // Try to connect to verify it's actually PostgreSQL
      try {
        const { stdout } = await execAsync(`echo "SELECT version();" | psql -h localhost -p ${SERVICE_CONFIG.POSTGRESQL_PORT} -U postgres -d thumbnail_maker_dev -t`);
        if (stdout.includes('PostgreSQL')) {
          this.services.postgresql = {
            ...this.services.postgresql,
            running: true,
            pid: portCheck.pid,
            version: stdout.trim(),
            status: 'healthy'
          };
          console.log(`✅ PostgreSQL is running (PID: ${portCheck.pid})`);
          return true;
        }
      } catch (error) {
        console.log(`⚠️  Port ${SERVICE_CONFIG.POSTGRESQL_PORT} is in use but PostgreSQL connection failed`);
        console.log(`   Error: ${error.message}`);
        this.services.postgresql = {
          ...this.services.postgresql,
          running: false,
          pid: portCheck.pid,
          status: 'port_occupied',
          error: error.message
        };
        return false;
      }
    }

    console.log(`❌ PostgreSQL is not running on port ${SERVICE_CONFIG.POSTGRESQL_PORT}`);
    this.services.postgresql.running = false;
    return false;
  }

  /**
   * Check Redis service
   */
  async checkRedis() {
    console.log(`🔴 Checking Redis on port ${SERVICE_CONFIG.REDIS_PORT}...`);
    
    const portCheck = await this.isPortInUse(SERVICE_CONFIG.REDIS_PORT);
    
    if (portCheck.inUse) {
      // Try to ping Redis
      try {
        const { stdout } = await execAsync(`echo "PING" | redis-cli -p ${SERVICE_CONFIG.REDIS_PORT}`);
        if (stdout.includes('PONG')) {
          this.services.redis = {
            ...this.services.redis,
            running: true,
            pid: portCheck.pid,
            status: 'healthy'
          };
          console.log(`✅ Redis is running (PID: ${portCheck.pid})`);
          return true;
        }
      } catch (error) {
        console.log(`⚠️  Port ${SERVICE_CONFIG.REDIS_PORT} is in use but Redis ping failed`);
        this.services.redis = {
          ...this.services.redis,
          running: false,
          pid: portCheck.pid,
          status: 'port_occupied'
        };
        return false;
      }
    }

    console.log(`❌ Redis is not running on port ${SERVICE_CONFIG.REDIS_PORT}`);
    this.services.redis.running = false;
    return false;
  }

  /**
   * Check Backend API service
   */
  async checkBackend() {
    console.log(`🚀 Checking Backend API on port ${SERVICE_CONFIG.BACKEND_PORT}...`);
    
    const portCheck = await this.isPortInUse(SERVICE_CONFIG.BACKEND_PORT);
    
    if (portCheck.inUse) {
      // Try to hit a health endpoint
      try {
        const response = await axios.get(`http://localhost:${SERVICE_CONFIG.BACKEND_PORT}/health`, {
          timeout: SERVICE_CONFIG.HEALTH_CHECK_TIMEOUT
        });
        
        this.services.backend = {
          ...this.services.backend,
          running: true,
          pid: portCheck.pid,
          status: 'healthy',
          responseTime: response.headers['response-time'] || 'unknown'
        };
        console.log(`✅ Backend API is running and healthy (PID: ${portCheck.pid})`);
        return true;
      } catch (error) {
        console.log(`⚠️  Port ${SERVICE_CONFIG.BACKEND_PORT} is in use but health check failed`);
        console.log(`   Error: ${error.message}`);
        this.services.backend = {
          ...this.services.backend,
          running: false,
          pid: portCheck.pid,
          status: 'unhealthy',
          error: error.message
        };
        return false;
      }
    }

    console.log(`❌ Backend API is not running on port ${SERVICE_CONFIG.BACKEND_PORT}`);
    this.services.backend.running = false;
    return false;
  }

  /**
   * Check Frontend service
   */
  async checkFrontend() {
    console.log(`⚛️  Checking Frontend on port ${SERVICE_CONFIG.FRONTEND_PORT}...`);
    
    const portCheck = await this.isPortInUse(SERVICE_CONFIG.FRONTEND_PORT);
    
    if (portCheck.inUse) {
      // Try to hit the frontend
      try {
        const response = await axios.get(`http://localhost:${SERVICE_CONFIG.FRONTEND_PORT}`, {
          timeout: SERVICE_CONFIG.HEALTH_CHECK_TIMEOUT,
          maxRedirects: 0,
          validateStatus: (status) => status < 500
        });
        
        this.services.frontend = {
          ...this.services.frontend,
          running: true,
          pid: portCheck.pid,
          status: 'healthy'
        };
        console.log(`✅ Frontend is running (PID: ${portCheck.pid})`);
        return true;
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`❌ Port ${SERVICE_CONFIG.FRONTEND_PORT} connection refused`);
        } else {
          console.log(`⚠️  Frontend health check inconclusive: ${error.message}`);
        }
        this.services.frontend = {
          ...this.services.frontend,
          running: portCheck.inUse,
          pid: portCheck.pid,
          status: portCheck.inUse ? 'unknown' : 'stopped'
        };
        return portCheck.inUse;
      }
    }

    console.log(`❌ Frontend is not running on port ${SERVICE_CONFIG.FRONTEND_PORT}`);
    this.services.frontend.running = false;
    return false;
  }

  /**
   * Start PostgreSQL service
   */
  async startPostgreSQL() {
    console.log('🚀 Starting PostgreSQL service...');
    
    try {
      // Check if postgres.exe is already running
      try {
        const { stdout } = await execAsync('tasklist | findstr postgres.exe');
        if (stdout.trim()) {
          console.log('⚠️  PostgreSQL processes already running, attempting restart...');
          await execAsync('taskkill /F /IM postgres.exe');
          await this.sleep(3000); // Wait for cleanup
        }
      } catch {
        // No existing processes, continue
      }

      // Start PostgreSQL using pg_ctl from B drive
      const startCommand = `"${SERVICE_CONFIG.POSTGRES_PATH}" -D "${SERVICE_CONFIG.POSTGRES_DATA_DIR}" -l "B:\\Thumbnail_maker\\database\\postgresql\\logs\\postgresql.log" start`;
      await execAsync(startCommand);
      
      console.log('⏳ Waiting for PostgreSQL to initialize...');
      await this.sleep(5000);
      
      // Verify it started successfully
      const isRunning = await this.checkPostgreSQL();
      if (isRunning) {
        console.log('✅ PostgreSQL started successfully');
        return true;
      } else {
        throw new Error('PostgreSQL failed to start properly');
      }
      
    } catch (error) {
      console.log(`❌ Failed to start PostgreSQL: ${error.message}`);
      
      // Alternative: try starting as a Windows service
      try {
        console.log('🔄 Attempting to start PostgreSQL as Windows service...');
        await execAsync('net start postgresql-x64-15');
        await this.sleep(3000);
        
        const isRunning = await this.checkPostgreSQL();
        if (isRunning) {
          console.log('✅ PostgreSQL started via Windows service');
          return true;
        }
      } catch (serviceError) {
        console.log(`❌ Service start also failed: ${serviceError.message}`);
      }
      
      return false;
    }
  }

  /**
   * Kill processes on specific port
   */
  async killProcessOnPort(port) {
    try {
      const portCheck = await this.isPortInUse(port);
      if (portCheck.inUse && portCheck.pid) {
        console.log(`💀 Killing process ${portCheck.pid} on port ${port}...`);
        await execAsync(`taskkill /F /PID ${portCheck.pid}`);
        await this.sleep(1000);
        return true;
      }
      return false;
    } catch (error) {
      console.log(`⚠️  Error killing process on port ${port}: ${error.message}`);
      return false;
    }
  }

  /**
   * Full service status check
   */
  async checkAllServices() {
    console.log('🔍 Performing comprehensive service check...\n');
    
    const results = {
      postgresql: await this.checkPostgreSQL(),
      redis: await this.checkRedis(),
      backend: await this.checkBackend(),
      frontend: await this.checkFrontend()
    };

    console.log('\n📊 Service Status Summary:');
    console.log('==========================');
    
    for (const [service, running] of Object.entries(results)) {
      const serviceInfo = this.services[service];
      const status = running ? '🟢 RUNNING' : '🔴 STOPPED';
      const pid = serviceInfo.pid ? `(PID: ${serviceInfo.pid})` : '';
      console.log(`${service.toUpperCase().padEnd(12)}: ${status} ${pid}`);
    }
    const allRunning = Object.values(results).every(Boolean);
    const readyForApp = results.postgresql && results.redis;
    
    console.log(`\n🎯 System Status:`);
    console.log(`   All Services: ${allRunning ? '🟢 ALL RUNNING' : '🔴 SOME STOPPED'}`);
    console.log(`   App Ready:    ${readyForApp ? '🟢 READY' : '🔴 NOT READY'}`);

    return {
      results,
      services: this.services,
      allRunning,
      readyForApp
    };
  }

  /**
   * Detect conflicts before starting services
   */
  async detectConflicts() {
    console.log('⚠️  Checking for service conflicts...\n');
    
    const conflicts = [];
    
    // Check for processes that might conflict (all within required range 8500-8599)
    const portsToCheck = [
      SERVICE_CONFIG.POSTGRESQL_PORT,
      SERVICE_CONFIG.REDIS_PORT,
      SERVICE_CONFIG.BACKEND_PORT,
      SERVICE_CONFIG.FRONTEND_PORT
    ];

    for (const port of portsToCheck) {
      const portCheck = await this.isPortInUse(port);
      if (portCheck.inUse) {
        conflicts.push({
          port,
          pid: portCheck.pid,
          connection: portCheck.connection
        });
      }
    }

    if (conflicts.length > 0) {
      console.log('🚨 Conflicts detected:');
      conflicts.forEach(conflict => {
        console.log(`   Port ${conflict.port}: PID ${conflict.pid || 'unknown'}`);
      });
      return conflicts;
    } else {
      console.log('✅ No port conflicts detected');
      return [];
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const detector = new ServiceDetector();

  try {
    if (args.includes('--check') || args.includes('-c')) {
      await detector.checkAllServices();
    } else if (args.includes('--conflicts') || args.includes('-cf')) {
      await detector.detectConflicts();
    } else if (args.includes('--postgresql') || args.includes('-pg')) {
      await detector.checkPostgreSQL();
    } else if (args.includes('--start-postgres') || args.includes('-sp')) {
      await detector.startPostgreSQL();
    } else if (args.includes('--kill-port')) {
      const portIndex = args.findIndex(arg => arg === '--kill-port');
      const port = args[portIndex + 1];
      if (port) {
        await detector.killProcessOnPort(parseInt(port));
      } else {
        console.log('❌ Please specify a port number');
      }
    } else {
      console.log('📋 Available commands:');
      console.log('  --check, -c           Check all services');
      console.log('  --conflicts, -cf      Check for port conflicts');
      console.log('  --postgresql, -pg     Check PostgreSQL only');
      console.log('  --start-postgres, -sp Start PostgreSQL service');
      console.log('  --kill-port [port]    Kill process on specific port');
      console.log('\nExamples:');
      console.log('  node services-detector.js --check');
      console.log('  node services-detector.js --start-postgres');
      console.log('  node services-detector.js --kill-port 8565');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ServiceDetector, SERVICE_CONFIG };