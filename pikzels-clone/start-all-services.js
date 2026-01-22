#!/usr/bin/env node

/**
 * Unified Service Startup Script
 *
 * Starts all services in the correct order for development:
 * 1. PostgreSQL (Port 8565)
 * 2. Redis (Port 8520)
 * 3. Backend API (Port 8550)
 * 4. Frontend (Port 8556)
 *
 * Features:
 * - Sequential startup with proper waiting
 * - Health checks after each service
 * - Port conflict detection
 * - B-drive path verification
 * - Detailed logging
 * - Graceful error handling
 *
 * Usage:
 *   node start-all-services.js                    # Start all services
 *   node start-all-services.js --databases-only   # Start PostgreSQL + Redis only
 *   node start-all-services.js --apps-only        # Start Backend + Frontend only
 *   node start-all-services.js --check            # Check status without starting
 */

const { spawn, exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

// Service Configuration (B-Drive Paths)
const CONFIG = {
  POSTGRES: {
    name: 'PostgreSQL',
    port: 8565,
    binPath: 'B:\\Thumbnail_maker\\database\\postgresql\\bin\\pg_ctl.exe',
    dataDir: 'B:\\Thumbnail_maker\\database\\postgresql\\data',
    logFile: 'B:\\Thumbnail_maker\\database\\postgresql\\logs\\postgresql.log',
    healthCheck: async () => {
      try {
        await execAsync(
          '"B:\\Thumbnail_maker\\database\\postgresql\\bin\\pg_isready.exe" -h localhost -p 8565 -U postgres'
        );
        return true;
      } catch {
        return false;
      }
    },
  },
  REDIS: {
    name: 'Redis',
    port: 8520,
    binPath: 'B:\\Thumbnail_maker\\database\\redis\\redis-server.exe',
    healthCheck: async () => {
      try {
        await execAsync(
          '"B:\\Thumbnail_maker\\database\\redis\\redis-cli.exe" -p 8520 ping'
        );
        return true;
      } catch {
        return false;
      }
    },
  },
  BACKEND: {
    name: 'Backend API',
    port: 8550,
    cwd: 'B:\\Thumbnail_maker\\pikzels-clone',
    command: 'npx',
    args: ['ts-node-dev', '--respawn', '--transpile-only', 'src/server.ts'],
    healthCheck: async () => {
      try {
        const response = await fetch('http://localhost:8550/health', {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  },
  FRONTEND: {
    name: 'Frontend',
    port: 8556,
    cwd: 'B:\\Thumbnail_maker\\pikzels-clone\\client',
    command: 'npm',
    args: ['run', 'dev'],
    healthCheck: async () => {
      try {
        await execAsync('netstat -an | findstr ":8556.*LISTENING"');
        return true;
      } catch {
        return false;
      }
    },
  },
};

class UnifiedServiceStarter {
  constructor() {
    this.startTime = new Date();
    this.processes = {};
    this.startedServices = [];
  }

  /**
   * Logging with timestamps and colors
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m', // Cyan
      success: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      debug: '\x1b[90m', // Gray
    };
    const reset = '\x1b[0m';
    const color = colors[level] || colors.info;

    const icons = {
      info: 'ℹ️ ',
      success: '✅',
      warn: '⚠️ ',
      error: '❌',
      debug: '🔍',
    };
    const icon = icons[level] || '';

    console.log(
      `${color}[${timestamp.substring(11, 19)}] ${icon} ${message}${reset}`
    );
    if (data) {
      console.log(`${color}   ${JSON.stringify(data, null, 2)}${reset}`);
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a port is in use
   */
  async isPortInUse(port) {
    try {
      const { stdout } = await execAsync(`netstat -an | findstr ":${port}"`);
      return stdout.includes('LISTENING') || stdout.includes('ESTABLISHED');
    } catch {
      return false;
    }
  }

  /**
   * Kill process on a specific port
   */
  async killProcessOnPort(port) {
    try {
      const { stdout } = await execAsync(
        `netstat -ano | findstr ":${port}.*LISTENING"`
      );
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const match = line.match(/LISTENING\s+(\d+)/);
        if (match) {
          const pid = match[1];
          this.log(
            'warn',
            `Killing existing process on port ${port} (PID: ${pid})`
          );
          try {
            await execAsync(`taskkill /F /PID ${pid}`);
            await this.sleep(1000);
          } catch (err) {
            // Process might already be dead
          }
        }
      }
    } catch {
      // No process found - that's fine
    }
  }

  /**
   * Verify B-drive paths exist
   */
  async verifyBDrivePaths() {
    this.log('info', 'Verifying B-drive installation paths...');

    const paths = [
      { name: 'PostgreSQL Binary', path: CONFIG.POSTGRES.binPath },
      { name: 'PostgreSQL Data', path: CONFIG.POSTGRES.dataDir },
      { name: 'Redis Binary', path: CONFIG.REDIS.binPath },
      { name: 'Project Root', path: CONFIG.BACKEND.cwd },
      { name: 'Frontend Root', path: CONFIG.FRONTEND.cwd },
    ];

    let allValid = true;
    const missing = [];

    for (const { name, path: filePath } of paths) {
      if (!fs.existsSync(filePath)) {
        this.log('error', `Missing: ${name}`, { path: filePath });
        allValid = false;
        missing.push({ name, path: filePath });
      } else {
        this.log('debug', `Found: ${name}`, { path: filePath });
      }
    }

    if (!allValid) {
      this.log('error', 'Some required paths are missing!', { missing });
      return false;
    }

    this.log('success', 'All B-drive paths verified!');
    return true;
  }

  /**
   * Check service status
   */
  async checkServiceStatus(serviceName) {
    const service = CONFIG[serviceName];
    if (!service) return false;

    const portInUse = await this.isPortInUse(service.port);
    if (!portInUse) return false;

    if (service.healthCheck) {
      return await service.healthCheck();
    }

    return portInUse;
  }

  /**
   * Check all services status
   */
  async checkAllServices() {
    this.log('info', 'Checking service status...');

    const status = {};
    for (const serviceName of Object.keys(CONFIG)) {
      const isRunning = await this.checkServiceStatus(serviceName);
      status[serviceName] = isRunning;

      const service = CONFIG[serviceName];
      if (isRunning) {
        this.log(
          'success',
          `${service.name} is running on port ${service.port}`
        );
      } else {
        this.log(
          'warn',
          `${service.name} is NOT running on port ${service.port}`
        );
      }
    }

    const allRunning = Object.values(status).every(s => s);
    if (allRunning) {
      this.log('success', 'All services are running!');
    } else {
      const downServices = Object.entries(status)
        .filter(([_, running]) => !running)
        .map(([name, _]) => CONFIG[name].name);
      this.log('warn', `Services down: ${downServices.join(', ')}`);
    }

    return status;
  }

  /**
   * Start PostgreSQL
   */
  async startPostgreSQL() {
    const service = CONFIG.POSTGRES;
    this.log('info', `Starting ${service.name} on port ${service.port}...`);

    // Check if already running
    if (await this.checkServiceStatus('POSTGRES')) {
      this.log('success', `${service.name} is already running!`);
      return true;
    }

    // Kill any zombie process
    await this.killProcessOnPort(service.port);

    try {
      // Try Windows Service first (most stable)
      this.log('debug', 'Attempting to start PostgreSQL via Windows Service...');
      try {
        await execAsync('net start "PostgreSQL-ThumbnailMaker-8565"');
        this.log('info', `Waiting for ${service.name} to start...`);
        await this.sleep(5000);

        // Verify it started
        const isRunning = await service.healthCheck();
        if (isRunning) {
          this.log(
            'success',
            `${service.name} started successfully via Windows Service on port ${service.port}!`
          );
          this.startedServices.push('POSTGRES');
          return true;
        }
      } catch (serviceError) {
        this.log('warn', 'Windows Service not available, trying pg_ctl...');
      }

      // Fallback to pg_ctl if service doesn't exist
      const startCmd = `"${service.binPath}" -D "${service.dataDir}" -l "${service.logFile}" start -o "-p ${service.port}"`;
      await execAsync(startCmd);

      this.log('info', `Waiting for ${service.name} to start...`);
      await this.sleep(5000);

      // Verify it started
      const isRunning = await service.healthCheck();
      if (isRunning) {
        this.log(
          'success',
          `${service.name} started successfully on port ${service.port}!`
        );
        this.startedServices.push('POSTGRES');
        return true;
      } else {
        this.log('error', `${service.name} failed to start properly`);
        this.log('warn', 'Consider registering PostgreSQL as a Windows Service for better stability');
        this.log('warn', 'Run: cd B:\\Thumbnail_maker\\database\\postgresql\\bin && pg_ctl register -N "PostgreSQL-ThumbnailMaker-8565" -D "B:\\Thumbnail_maker\\database\\postgresql\\data" -o "-p 8565"');
        return false;
      }
    } catch (error) {
      this.log('error', `Failed to start ${service.name}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Start Redis
   */
  async startRedis() {
    const service = CONFIG.REDIS;
    this.log('info', `Starting ${service.name} on port ${service.port}...`);

    // Check if already running
    if (await this.checkServiceStatus('REDIS')) {
      this.log('success', `${service.name} is already running!`);
      return true;
    }

    // Kill any zombie process
    await this.killProcessOnPort(service.port);

    try {
      // Start Redis in background
      const redisProcess = spawn(
        service.binPath,
        [`--port`, service.port.toString()],
        {
          detached: true,
          stdio: ['ignore', 'ignore', 'ignore'],
          shell: true,
        }
      );

      redisProcess.unref();
      this.processes.redis = redisProcess;

      this.log('info', `Waiting for ${service.name} to start...`);
      await this.sleep(3000);

      // Verify it started
      const isRunning = await service.healthCheck();
      if (isRunning) {
        this.log(
          'success',
          `${service.name} started successfully on port ${service.port}!`
        );
        this.startedServices.push('REDIS');
        return true;
      } else {
        this.log('error', `${service.name} failed to start properly`);
        return false;
      }
    } catch (error) {
      this.log('error', `Failed to start ${service.name}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Start Backend API
   */
  async startBackend() {
    const service = CONFIG.BACKEND;
    this.log('info', `Starting ${service.name} on port ${service.port}...`);

    // Check if already running
    if (await this.checkServiceStatus('BACKEND')) {
      this.log('success', `${service.name} is already running!`);
      return true;
    }

    // Kill any zombie process
    await this.killProcessOnPort(service.port);

    try {
      // Start backend
      const backendProcess = spawn(service.command, service.args, {
        cwd: service.cwd,
        stdio: ['ignore', 'ignore', 'ignore'],
        shell: true,
        detached: true,
        env: { ...process.env, PORT: service.port.toString() },
      });

      backendProcess.unref();
      this.processes.backend = backendProcess;

      this.log('info', `Waiting for ${service.name} to start...`);

      // Poll for up to 45 seconds
      for (let i = 0; i < 45; i++) {
        await this.sleep(1000);

        if (await service.healthCheck()) {
          this.log(
            'success',
            `${service.name} started successfully on port ${service.port}!`
          );
          this.startedServices.push('BACKEND');
          return true;
        }
      }

      this.log('warn', `${service.name} startup timeout (45s)`);

      // One final check
      if (await service.healthCheck()) {
        this.log('success', `${service.name} is running!`);
        this.startedServices.push('BACKEND');
        return true;
      }

      return false;
    } catch (error) {
      this.log('error', `Failed to start ${service.name}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Start Frontend
   */
  async startFrontend() {
    const service = CONFIG.FRONTEND;
    this.log('info', `Starting ${service.name} on port ${service.port}...`);

    // Check if already running
    if (await this.checkServiceStatus('FRONTEND')) {
      this.log('success', `${service.name} is already running!`);
      return true;
    }

    // Kill any zombie process
    await this.killProcessOnPort(service.port);

    try {
      // Start frontend
      const frontendProcess = spawn(service.command, service.args, {
        cwd: service.cwd,
        stdio: ['ignore', 'ignore', 'ignore'],
        shell: true,
        detached: true,
      });

      frontendProcess.unref();
      this.processes.frontend = frontendProcess;

      this.log('info', `Waiting for ${service.name} to start...`);

      // Poll for up to 60 seconds (Vite can be slow)
      for (let i = 0; i < 60; i++) {
        await this.sleep(1000);

        if (await service.healthCheck()) {
          this.log(
            'success',
            `${service.name} started successfully on port ${service.port}!`
          );
          this.startedServices.push('FRONTEND');
          return true;
        }
      }

      this.log('warn', `${service.name} startup timeout (60s)`);

      // One final check
      if (await service.healthCheck()) {
        this.log('success', `${service.name} is running!`);
        this.startedServices.push('FRONTEND');
        return true;
      }

      return false;
    } catch (error) {
      this.log('error', `Failed to start ${service.name}`, {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Start all services in order
   */
  async startAll(options = {}) {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  🚀 UNIFIED SERVICE STARTUP');
    console.log('═══════════════════════════════════════════');
    console.log('');

    // Pre-flight checks
    this.log('info', 'Running pre-flight checks...');

    const pathsValid = await this.verifyBDrivePaths();
    if (!pathsValid) {
      this.log('error', 'Pre-flight checks failed! Cannot start services.');
      return false;
    }

    this.log('success', 'Pre-flight checks passed!');
    console.log('');

    // Determine which services to start
    const databasesOnly = options.databasesOnly || false;
    const appsOnly = options.appsOnly || false;

    let services = [];
    if (databasesOnly) {
      services = ['PostgreSQL', 'Redis'];
      this.log('info', 'Starting databases only...');
    } else if (appsOnly) {
      services = ['Backend', 'Frontend'];
      this.log('info', 'Starting application servers only...');
    } else {
      services = ['PostgreSQL', 'Redis', 'Backend', 'Frontend'];
      this.log('info', 'Starting all services...');
    }

    console.log('');

    // Start services in order
    const results = {};

    // 1. PostgreSQL
    if (services.includes('PostgreSQL')) {
      results.postgresql = await this.startPostgreSQL();
      if (!results.postgresql) {
        this.log(
          'error',
          'Failed to start PostgreSQL - aborting startup sequence'
        );
        return false;
      }
      console.log('');
    }

    // 2. Redis
    if (services.includes('Redis')) {
      results.redis = await this.startRedis();
      if (!results.redis) {
        this.log('error', 'Failed to start Redis - aborting startup sequence');
        return false;
      }
      console.log('');
    }

    // 3. Backend (needs PostgreSQL + Redis)
    if (services.includes('Backend')) {
      results.backend = await this.startBackend();
      if (!results.backend) {
        this.log(
          'error',
          'Failed to start Backend - aborting startup sequence'
        );
        return false;
      }
      console.log('');
    }

    // 4. Frontend (needs Backend)
    if (services.includes('Frontend')) {
      results.frontend = await this.startFrontend();
      if (!results.frontend) {
        this.log(
          'warn',
          'Failed to start Frontend - but other services are running'
        );
        // Don't abort, frontend is less critical
      }
      console.log('');
    }

    // Final health check
    this.log('info', 'Running final health verification...');
    const finalStatus = await this.checkAllServices();
    console.log('');

    // Summary
    const elapsed = ((new Date() - this.startTime) / 1000).toFixed(1);
    console.log('═══════════════════════════════════════════');
    console.log('  📊 STARTUP SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log('');

    for (const [serviceName, running] of Object.entries(finalStatus)) {
      const service = CONFIG[serviceName];
      const icon = running ? '✅' : '❌';
      console.log(
        `${icon} ${service.name.padEnd(15)} : Port ${service.port} ${running ? 'RUNNING' : 'STOPPED'}`
      );
    }

    console.log('');
    console.log(`⏱️  Total startup time: ${elapsed}s`);
    console.log('');

    const allRunning = Object.values(finalStatus).every(s => s);
    if (allRunning) {
      console.log('🎉 All services started successfully!');
      console.log('');
      console.log('🔗 Quick Links:');
      console.log(`   Backend:  http://localhost:${CONFIG.BACKEND.port}`);
      console.log(`   Frontend: http://localhost:${CONFIG.FRONTEND.port}`);
      console.log(
        `   Health:   http://localhost:${CONFIG.BACKEND.port}/health`
      );
      console.log('');
      console.log('📡 To enable auto-restart monitoring:');
      console.log('   npm run monitor:start');
      console.log('');
    } else {
      console.log('⚠️  Some services failed to start. Check logs above.');
      console.log('');
    }

    console.log('═══════════════════════════════════════════');
    console.log('');

    return allRunning;
  }

  /**
   * Cleanup spawned processes
   */
  cleanup() {
    for (const [name, process] of Object.entries(this.processes)) {
      if (process && !process.killed) {
        this.log('debug', `Cleaning up ${name} process...`);
        try {
          process.kill();
        } catch (err) {
          // Ignore
        }
      }
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log('');
    console.log('🚀 Unified Service Startup Script');
    console.log('═══════════════════════════════════════════');
    console.log('');
    console.log('Usage:');
    console.log('  node start-all-services.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --databases-only, -d    Start PostgreSQL and Redis only');
    console.log('  --apps-only, -a         Start Backend and Frontend only');
    console.log(
      '  --check, -c             Check service status without starting'
    );
    console.log('  --help, -h              Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node start-all-services.js');
    console.log('  node start-all-services.js --databases-only');
    console.log('  node start-all-services.js --check');
    console.log('');
    console.log('Service Ports:');
    console.log('  PostgreSQL: 8565');
    console.log('  Redis:      8520');
    console.log('  Backend:    8550');
    console.log('  Frontend:   8556');
    console.log('');
    return;
  }

  const starter = new UnifiedServiceStarter();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    starter.cleanup();
    process.exit(0);
  });

  try {
    if (args.includes('--check') || args.includes('-c')) {
      await starter.checkAllServices();
    } else {
      const options = {
        databasesOnly: args.includes('--databases-only') || args.includes('-d'),
        appsOnly: args.includes('--apps-only') || args.includes('-a'),
      };

      const success = await starter.startAll(options);

      if (!success) {
        process.exit(1);
      }

      // Exit successfully after starting all services
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    starter.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { UnifiedServiceStarter };
