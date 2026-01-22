#!/usr/bin/env node

/**
 * Autonomous Service Monitor Agent
 * 
 * Continuously monitors the health of all services (PostgreSQL, Redis, Backend, Frontend)
 * and automatically triggers smart-restart when services are down or unhealthy.
 * 
 * Features:
 * - Continuous health monitoring with configurable intervals
 * - Intelligent restart logic using existing smart-restart.js
 * - Escalation policies (quick -> full restart -> manual intervention)
 * - Detailed logging and alerting
 * - Graceful shutdown and cleanup
 * - Web dashboard for monitoring status
 * - Notification system for critical issues
 */

const { ServiceDetector, SERVICE_CONFIG } = require('./services-detector.js');
const { SmartRestart } = require('./smart-restart.js');
const { B_DRIVE_PATHS } = require('./b-drive-paths.js');

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);
const PID_FILE = path.join(__dirname, 'logs', 'service-monitor-agent.pid');

class ServiceMonitorAgent {
  constructor(options = {}) {
    this.config = {
      // Monitoring intervals
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      deepHealthCheckInterval: options.deepHealthCheckInterval || 300000, // 5 minutes
      retryInterval: options.retryInterval || 10000, // 10 seconds on failure
      
      // Restart policies
      maxQuickRestarts: options.maxQuickRestarts || 2,
      maxFullRestarts: options.maxFullRestarts || 3,
      cooldownPeriod: options.cooldownPeriod || 300000, // 5 minutes between restart attempts
      
      // Alerting thresholds
      alertOnDowntime: options.alertOnDowntime || 60000, // Alert after 1 minute down
      criticalDowntime: options.criticalDowntime || 300000, // Critical alert after 5 minutes
      
      // Logging
      logLevel: options.logLevel || 'info',
      logFile: options.logFile || path.join(__dirname, 'logs', 'service-monitor.log'),
      
      // Web dashboard
      enableDashboard: options.enableDashboard !== false,
      dashboardPort: options.dashboardPort || 8577, // Within our port range
      
      // Auto-start services on first run
      autoStartOnBoot: options.autoStartOnBoot !== false,
      requireBDrivePaths: options.requireBDrivePaths !== false
    };

    this.detector = new ServiceDetector();
    this.restarter = new SmartRestart();
    this.bDriveReady = false;
    
    // Agent state
    this.isRunning = false;
    this.isPaused = false;
    this.monitoringIntervals = {};
    this.serviceState = {};
    this.restartAttempts = {};
    this.lastHealthCheck = null;
    this.startTime = new Date();
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      failedChecks: 0,
      quickRestarts: 0,
      fullRestarts: 0,
      uptime: 0,
      lastRestart: null,
      downtimeEvents: []
    };

    // Initialize logging
    this.initializeLogging();
    
    // Initialize service state
    this.initializeServiceState();
    
    this.log('info', '🤖 Service Monitor Agent initialized');
    this.log('info', `📊 Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Initialize logging system
   */
  initializeLogging() {
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Initialize service state tracking
   */
  initializeServiceState() {
    const services = ['postgresql', 'redis', 'backend', 'frontend'];
    
    for (const service of services) {
      this.serviceState[service] = {
        isHealthy: false,
        lastHealthy: null,
        lastUnhealthy: null,
        consecutiveFailures: 0,
        downtimeStart: null,
        totalDowntime: 0,
        restartHistory: []
      };
      
      this.restartAttempts[service] = {
        quickRestarts: 0,
        fullRestarts: 0,
        lastRestart: null
      };
    }
  }

  /**
   * Logging function with levels and file output
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logLevels = { error: 0, warn: 1, info: 2, debug: 3 };
    const currentLevel = logLevels[this.config.logLevel] || 2;
    
    if (logLevels[level] <= currentLevel) {
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        data,
        agent: 'ServiceMonitor'
      };
      
      // Console output with colors
      const colors = {
        error: '\x1b[31m',   // Red
        warn: '\x1b[33m',    // Yellow
        info: '\x1b[36m',    // Cyan
        debug: '\x1b[90m'    // Gray
      };
      const reset = '\x1b[0m';
      
      console.log(`${colors[level]}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`);
      if (data) {
        console.log(`${colors[level]}   Data:`, JSON.stringify(data, null, 2), reset);
      }
      
      // File output
      try {
        fs.appendFileSync(this.config.logFile, JSON.stringify(logEntry) + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }

  /**
   * Start the monitoring agent
   */
  async start() {
    if (this.isRunning) {
      this.log('warn', 'Agent is already running');
      return;
    }

    await this.ensureSingleInstance();

    this.isRunning = true;
    this.log('info', '🚀 Starting Service Monitor Agent...');

    // Initial health check and auto-start if configured
    if (this.config.requireBDrivePaths) {
      const verification = await this.verifyBDrivePaths();
      if (!verification.valid) {
        this.isPaused = true;
        this.log('error', '🚫 B-drive path verification failed. Manual intervention required.', { missing: verification.missing });
        await this.escalateToManualIntervention(Object.keys(this.serviceState));
        return;
      }
      this.bDriveReady = true;
      this.log('info', '✅ B-drive services verified');
    }

    if (this.config.autoStartOnBoot) {
      this.log('info', '🔍 Performing initial health check...');
      const healthStatus = await this.performHealthCheck();

      if (!healthStatus.allRunning) {
        this.log('info', '🚀 Auto-starting services on boot...');
        await this.handleUnhealthyServices(healthStatus);
      }
    }

    // Start monitoring intervals
    this.startMonitoring();
    
    // Start web dashboard if enabled
    if (this.config.enableDashboard) {
      await this.startWebDashboard();
    }

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();

    this.log('info', '✅ Service Monitor Agent started successfully');
    this.log('info', `📊 Monitoring ${Object.keys(this.serviceState).length} services`);
    this.log('info', `🔄 Health check interval: ${this.config.healthCheckInterval}ms`);
  }

  setupShutdownHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        this.log('info', `Received signal ${signal}. Shutting down...`);
        await this.stop();
        process.exit(0);
      });
    });

    process.on('exit', () => {
      this.cleanupPidFile();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring() {
    // Regular health checks
    this.monitoringIntervals.healthCheck = setInterval(async () => {
      if (!this.isPaused) {
        await this.runHealthCheckCycle();
      }
    }, this.config.healthCheckInterval);

    // Deep health checks
    this.monitoringIntervals.deepHealthCheck = setInterval(async () => {
      if (!this.isPaused) {
        await this.runDeepHealthCheck();
      }
    }, this.config.deepHealthCheckInterval);

    // Statistics update
    this.monitoringIntervals.statsUpdate = setInterval(() => {
      this.updateStatistics();
    }, 60000); // Every minute

    this.log('info', '⏰ Monitoring intervals started');
  }

  /**
   * Perform a health check cycle
   */
  async runHealthCheckCycle() {
    try {
      this.stats.totalChecks++;
      this.log('debug', '🔍 Running health check cycle...');
      
      const healthStatus = await this.performHealthCheck();
      this.lastHealthCheck = new Date();
      
      if (healthStatus.allRunning) {
        this.log('debug', '✅ All services healthy');
        this.updateServiceHealth(healthStatus.results, true);
      } else {
        this.log('warn', '⚠️  Unhealthy services detected', {
          unhealthyServices: this.getUnhealthyServices(healthStatus.results)
        });
        this.stats.failedChecks++;
        this.updateServiceHealth(healthStatus.results, false);
        
        // Handle unhealthy services
        await this.handleUnhealthyServices(healthStatus);
      }
      
    } catch (error) {
      this.log('error', 'Health check cycle failed', { error: error.message });
      this.stats.failedChecks++;
    }
  }

  /**
   * Perform health check using existing detector
   */
  async performHealthCheck() {
    return await this.detector.checkAllServices();
  }

  /**
   * Update service health state
   */
  updateServiceHealth(results, allHealthy) {
    const now = new Date();
    
    for (const [service, isHealthy] of Object.entries(results)) {
      const serviceState = this.serviceState[service];
      const wasHealthy = serviceState.isHealthy;
      
      serviceState.isHealthy = isHealthy;
      
      if (isHealthy) {
        serviceState.lastHealthy = now;
        serviceState.consecutiveFailures = 0;
        
        // End downtime period if it was down
        if (serviceState.downtimeStart) {
          const downtimeMs = now - serviceState.downtimeStart;
          serviceState.totalDowntime += downtimeMs;
          serviceState.downtimeStart = null;
          
          this.log('info', `✅ ${service.toUpperCase()} back online after ${Math.round(downtimeMs / 1000)}s downtime`);
        }
        
      } else {
        serviceState.lastUnhealthy = now;
        serviceState.consecutiveFailures++;
        
        // Start downtime tracking if not already down
        if (!serviceState.downtimeStart) {
          serviceState.downtimeStart = now;
          this.log('warn', `🔴 ${service.toUpperCase()} went down`);
        }
      }
    }
  }

  /**
   * Get list of unhealthy services
   */
  getUnhealthyServices(results) {
    return Object.entries(results)
      .filter(([service, isHealthy]) => !isHealthy)
      .map(([service]) => service);
  }

  /**
   * Handle unhealthy services with restart logic
   */
  async handleUnhealthyServices(healthStatus) {
    const unhealthyServices = this.getUnhealthyServices(healthStatus.results);

    if (this.config.requireBDrivePaths && !this.bDriveReady) {
      const verification = await this.verifyBDrivePaths();
      if (!verification.valid) {
        this.isPaused = true;
        this.log('error', '🚫 Skipping restart attempts. B-drive verification failed.', { missing: verification.missing, unhealthyServices });
        await this.escalateToManualIntervention(unhealthyServices);
        return;
      }
      this.bDriveReady = true;
      this.log('info', '✅ B-drive services verified');
    }

    if (unhealthyServices.length === 0) return;

    this.log('info', `🏥 Handling ${unhealthyServices.length} unhealthy services: ${unhealthyServices.join(', ')}`);

    // Check if we're in cooldown period
    const now = new Date();
    const lastRestart = this.stats.lastRestart;
    
    if (lastRestart && (now - lastRestart) < this.config.cooldownPeriod) {
      const remainingCooldown = Math.round((this.config.cooldownPeriod - (now - lastRestart)) / 1000);
      this.log('info', `⏳ Restart cooldown active. ${remainingCooldown}s remaining`);
      return;
    }

    // Determine restart strategy
    const totalQuickRestarts = Object.values(this.restartAttempts).reduce((sum, attempts) => sum + attempts.quickRestarts, 0);
    const totalFullRestarts = Object.values(this.restartAttempts).reduce((sum, attempts) => sum + attempts.fullRestarts, 0);

    if (totalQuickRestarts < this.config.maxQuickRestarts) {
      await this.performQuickRestart(unhealthyServices);
    } else if (totalFullRestarts < this.config.maxFullRestarts) {
      await this.performFullRestart(unhealthyServices);
    } else {
      await this.escalateToManualIntervention(unhealthyServices);
    }
  }

  /**
   * Perform quick restart (backend + frontend only)
   */
  async performQuickRestart(unhealthyServices) {
    this.log('info', '⚡ Initiating quick restart...');
    
    try {
      const success = await this.restarter.quickRestart();
      this.stats.quickRestarts++;
      this.stats.lastRestart = new Date();
      
      // Update restart attempts for affected services
      const quickRestartServices = ['backend', 'frontend'];
      for (const service of quickRestartServices) {
        if (unhealthyServices.includes(service)) {
          this.restartAttempts[service].quickRestarts++;
          this.restartAttempts[service].lastRestart = new Date();
          this.serviceState[service].restartHistory.push({
            type: 'quick',
            timestamp: new Date(),
            success
          });
        }
      }
      
      if (success) {
        this.log('info', '✅ Quick restart completed successfully');
      } else {
        this.log('error', '❌ Quick restart failed');
      }
      
      // Wait and verify
      await this.sleep(10000);
      const verifyHealth = await this.performHealthCheck();
      
      if (!verifyHealth.allRunning) {
        this.log('warn', '⚠️  Services still unhealthy after quick restart');
      }
      
    } catch (error) {
      this.log('error', 'Quick restart failed', { error: error.message });
    }
  }

  /**
   * Perform full restart (all services)
   */
  async performFullRestart(unhealthyServices) {
    this.log('info', '🔄 Initiating full system restart...');
    
    try {
      const result = await this.restarter.smartRestart();
      this.stats.fullRestarts++;
      this.stats.lastRestart = new Date();
      
      // Update restart attempts for all services
      for (const service of Object.keys(this.serviceState)) {
        this.restartAttempts[service].fullRestarts++;
        this.restartAttempts[service].lastRestart = new Date();
        this.serviceState[service].restartHistory.push({
          type: 'full',
          timestamp: new Date(),
          success: result.allStarted
        });
      }
      
      if (result.allStarted) {
        this.log('info', '✅ Full restart completed successfully');
      } else {
        this.log('error', '❌ Full restart completed with errors', { results: result.results });
      }
      
    } catch (error) {
      this.log('error', 'Full restart failed', { error: error.message });
    }
  }

  /**
   * Escalate to manual intervention
   */
  async escalateToManualIntervention(unhealthyServices) {
    this.log('error', '🚨 CRITICAL: Maximum restart attempts exceeded. Manual intervention required.');
    this.log('error', '🚨 Unhealthy services:', { services: unhealthyServices });
    
    // Create critical alert file
    const alertData = {
      timestamp: new Date().toISOString(),
      level: 'CRITICAL',
      message: 'Service Monitor Agent requires manual intervention',
      unhealthyServices,
      restartAttempts: this.restartAttempts,
      serviceState: this.serviceState,
      recommendations: [
        'Check service logs for errors',
        'Verify B drive database installations',
        'Check for port conflicts',
        'Review system resources (RAM, disk space)',
        'Consider system restart if issues persist'
      ]
    };
    
    const alertFile = path.join(__dirname, 'logs', `CRITICAL-ALERT-${Date.now()}.json`);
    fs.writeFileSync(alertFile, JSON.stringify(alertData, null, 2));
    
    this.log('error', `🚨 Critical alert saved to: ${alertFile}`);
    
    // Pause monitoring to prevent spam
    this.pauseMonitoring();
    
    // Send notification if configured
    await this.sendCriticalNotification(alertData);
  }

  /**
   * Run deep health check with additional diagnostics
   */
  async runDeepHealthCheck() {
    this.log('debug', '🔍 Running deep health check...');
    
    try {
      // 1. Validate port compliance (CRITICAL per PORT-COMPLIANCE-RULES.md)
      const portCompliance = this.validatePortCompliance();
      if (!portCompliance.valid) {
        this.log('error', '🚨 Port compliance violations found - this may cause service failures');
      }
      
      // 2. Check for external port conflicts (e.g., Polypane on 8556)
      const portConflicts = await this.checkPortConflicts();
      if (portConflicts.hasConflicts) {
        this.log('warn', '⚠️  External processes detected on required ports:', {
          conflicts: portConflicts.conflicts.map(c => `${c.service}:${c.port} used by PID ${c.pid}`)
        });
      }
      
      // 3. Check for conflicts using existing detector
      const conflicts = await this.detector.detectConflicts();
      if (conflicts.length > 0) {
        this.log('warn', '⚠️  Port conflicts detected by services-detector', { conflicts });
      }
      
      // 4. Check system resources
      await this.checkSystemResources();
      
      // 5. Verify B drive paths (per WARP-RULES.md)
      await this.verifyBDrivePaths();
      
    } catch (error) {
      this.log('error', 'Deep health check failed', { error: error.message });
    }
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    try {
      const { promisify } = require('util');
      const exec = promisify(require('child_process').exec);
      
      // Check available memory
      const { stdout: memInfo } = await exec('wmic computersystem get TotalPhysicalMemory /format:value');
      const totalMem = parseInt(memInfo.match(/TotalPhysicalMemory=(\d+)/)?.[1] || '0');
      
      // Check disk space on B drive
      try {
        const { stdout: diskInfo } = await exec('wmic logicaldisk where DeviceID="B:" get Size,FreeSpace /format:value');
        const freeSpace = parseInt(diskInfo.match(/FreeSpace=(\d+)/)?.[1] || '0');
        const totalSize = parseInt(diskInfo.match(/Size=(\d+)/)?.[1] || '0');
        
        if (freeSpace < 1000000000) { // Less than 1GB free
          this.log('warn', '⚠️  Low disk space on B drive', {
            freeSpaceGB: Math.round(freeSpace / 1000000000),
            totalSizeGB: Math.round(totalSize / 1000000000)
          });
        }
      } catch (diskError) {
        this.log('debug', 'Could not check B drive disk space', { error: diskError.message });
      }
      
    } catch (error) {
      this.log('debug', 'System resource check failed', { error: error.message });
    }
  }

  /**
   * Validate port compliance according to PORT-COMPLIANCE-RULES.md
   */
  validatePortCompliance() {
    this.log('debug', '🔍 Validating port compliance...');
    
    const config = this.config.portCompliance;
    if (!config || !config.enforceRange) {
      this.log('debug', 'Port compliance checking disabled');
      return { valid: true, warnings: [], errors: [] };
    }
    
    const warnings = [];
    const errors = [];
    const requiredPorts = config.requiredPorts || {
      postgresql: 8565,
      redis: 8520, 
      backend: 8550,
      frontend: 8556
    };
    
    // Check each service port is in valid range
    for (const [service, port] of Object.entries(requiredPorts)) {
      if (port < config.minPort || port > config.maxPort) {
        errors.push({
          service,
          port,
          issue: `Port ${port} outside required range ${config.minPort}-${config.maxPort}`
        });
      }
    }
    
    // Check for forbidden ports
    if (config.forbiddenPorts) {
      for (const [service, port] of Object.entries(requiredPorts)) {
        if (config.forbiddenPorts.includes(port)) {
          errors.push({
            service,
            port,
            issue: `Port ${port} is in forbidden ports list`
          });
        }
      }
    }
    
    // Validate against services-detector configuration
    try {
      const { SERVICE_CONFIG } = require('./services-detector.js');
      
      if (SERVICE_CONFIG.POSTGRESQL_PORT !== requiredPorts.postgresql) {
        warnings.push({
          service: 'postgresql',
          issue: `Config mismatch: Monitor expects ${requiredPorts.postgresql}, services-detector uses ${SERVICE_CONFIG.POSTGRESQL_PORT}`
        });
      }
      
      if (SERVICE_CONFIG.REDIS_PORT !== requiredPorts.redis) {
        warnings.push({
          service: 'redis',
          issue: `Config mismatch: Monitor expects ${requiredPorts.redis}, services-detector uses ${SERVICE_CONFIG.REDIS_PORT}`
        });
      }
      
      if (SERVICE_CONFIG.BACKEND_PORT !== requiredPorts.backend) {
        warnings.push({
          service: 'backend',
          issue: `Config mismatch: Monitor expects ${requiredPorts.backend}, services-detector uses ${SERVICE_CONFIG.BACKEND_PORT}`
        });
      }
      
      if (SERVICE_CONFIG.FRONTEND_PORT !== requiredPorts.frontend) {
        warnings.push({
          service: 'frontend',
          issue: `Config mismatch: Monitor expects ${requiredPorts.frontend}, services-detector uses ${SERVICE_CONFIG.FRONTEND_PORT}`
        });
      }
      
    } catch (serviceConfigError) {
      warnings.push({
        service: 'services-detector',
        issue: `Cannot validate against services-detector config: ${serviceConfigError.message}`
      });
    }
    
    // Log results
    if (errors.length > 0) {
      this.log('error', '🚨 Port compliance violations detected:', { errors });
      if (config.strictCompliance) {
        return { valid: false, warnings, errors };
      }
    }
    
    if (warnings.length > 0) {
      this.log('warn', '⚠️  Port compliance warnings:', { warnings });
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      this.log('debug', '✅ Port compliance validation passed');
    }
    
    return { valid: errors.length === 0, warnings, errors };
  }

  /**
   * Check for port conflicts with external processes
   */
  async checkPortConflicts() {
    this.log('debug', '🔍 Checking for port conflicts...');
    
    const config = this.config.portCompliance;
    const requiredPorts = config?.requiredPorts || {
      postgresql: 8565,
      redis: 8520,
      backend: 8550, 
      frontend: 8556
    };
    
    const conflicts = [];
    
    for (const [service, port] of Object.entries(requiredPorts)) {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          for (const line of lines) {
            const pidMatch = line.match(/\s+(\d+)\s*$/);
            if (pidMatch) {
              const pid = pidMatch[1];
              
              // Check if it's our expected service
              const isExpectedProcess = await this.isExpectedServiceProcess(service, pid);
              
              if (!isExpectedProcess) {
                conflicts.push({
                  service,
                  port,
                  pid,
                  description: `Unexpected process using ${service} port ${port}`,
                  line: line.trim()
                });
              }
            }
          }
        }
      } catch (error) {
        this.log('debug', `Port conflict check failed for ${service}:${port}:`, { error: error.message });
      }
    }
    
    if (conflicts.length > 0) {
      this.log('warn', '⚠️  Port conflicts detected:', { conflicts });
      return { hasConflicts: true, conflicts };
    }
    
    this.log('debug', '✅ No port conflicts detected');
    return { hasConflicts: false, conflicts: [] };
  }

  /**
   * Check if a PID belongs to an expected service process
   */
  async isExpectedServiceProcess(service, pid) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV`);
      const lines = stdout.split('\n');
      
      if (lines.length > 1) {
        const processData = lines[1].split(',').map(s => s.replace(/"/g, ''));
        const processName = processData[0]?.toLowerCase() || '';
        
        // Define expected process names for each service
        const expectedProcesses = {
          postgresql: ['postgres.exe', 'pg_ctl.exe'],
          redis: ['redis-server.exe', 'redis.exe'],
          backend: ['node.exe', 'ts-node-dev'],
          frontend: ['node.exe'] // Vite runs on Node
        };
        
        const expected = expectedProcesses[service] || [];
        return expected.some(exp => processName.includes(exp.toLowerCase()));
      }
    } catch (error) {
      this.log('debug', `Process check failed for PID ${pid}:`, { error: error.message });
    }
    
    return false; // Default to suspicious if we can't verify
  }

  /**
   * Verify B drive database paths
   */
  async verifyBDrivePaths() {
    const requiredPaths = [
      {
        key: 'PG_CTL_BIN',
        path: B_DRIVE_PATHS.PG_CTL_BIN || SERVICE_CONFIG.POSTGRES_PATH
      },
      {
        key: 'POSTGRES_DATA_DIR',
        path: B_DRIVE_PATHS.POSTGRES_DATA_DIR || SERVICE_CONFIG.POSTGRES_DATA_DIR
      },
      {
        key: 'REDIS_SERVER',
        path: B_DRIVE_PATHS.REDIS_SERVER || SERVICE_CONFIG.REDIS_PATH
      }
    ];

    const status = requiredPaths.map(item => {
      const normalizedPath = item.path ? path.normalize(item.path) : item.path;
      const exists = normalizedPath ? fs.existsSync(normalizedPath) : false;
      return { key: item.key, path: normalizedPath, exists };
    });

    const missing = status.filter(entry => !entry.exists).map(entry => entry.key);

    if (missing.length > 0) {
      this.log('error', '🚫 B-drive verification details', { status });
      return { valid: false, missing };
    }

    this.log('debug', '✅ B-drive verification details', { status });
    return { valid: true, missing: [] };
  }

  /**
   * Update statistics
   */
  updateStatistics() {
    const now = new Date();
    this.stats.uptime = Math.round((now - this.startTime) / 1000);
    
    // Calculate total service uptime percentage
    let totalUptime = 0;
    let serviceCount = 0;
    
    for (const [service, state] of Object.entries(this.serviceState)) {
      serviceCount++;
      const serviceUptime = this.calculateServiceUptime(state, now);
      totalUptime += serviceUptime;
    }
    
    this.stats.averageUptime = serviceCount > 0 ? totalUptime / serviceCount : 0;
  }

  /**
   * Calculate uptime percentage for a service
   */
  calculateServiceUptime(serviceState, now) {
    const totalTime = now - this.startTime;
    const downtime = serviceState.totalDowntime + 
      (serviceState.downtimeStart ? now - serviceState.downtimeStart : 0);
    
    return totalTime > 0 ? ((totalTime - downtime) / totalTime) * 100 : 100;
  }

  /**
   * Start web dashboard server
   */
  async startWebDashboard() {
    try {
      await this.ensureDashboardPortAvailable(this.config.dashboardPort);
      
      const http = require('http');
      const url = require('url');
      
      const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        // CORS Headers - Essential for frontend integration
        const corsHeaders = {
          'Access-Control-Allow-Origin': this.getAllowedOrigin(req),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400' // 24 hours
        };
        
        // Set CORS headers for all responses
        Object.entries(corsHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        
        // Handle preflight OPTIONS requests
        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }
        
        // Route handling
        try {
          if (pathname === '/' || pathname === '/status') {
            this.handleStatusEndpoint(req, res);
          } else if (pathname === '/health') {
            this.handleHealthEndpoint(req, res);
          } else if (pathname === '/services') {
            this.handleServicesEndpoint(req, res);
          } else if (pathname === '/statistics') {
            this.handleStatisticsEndpoint(req, res);
          } else if (pathname === '/logs') {
            this.handleLogsEndpoint(req, res, parsedUrl.query);
          } else if (pathname === '/config') {
            this.handleConfigEndpoint(req, res);
          } else if (pathname === '/restart') {
            this.handleRestartEndpoint(req, res, parsedUrl.query);
          } else {
            this.handleNotFound(req, res);
          }
        } catch (error) {
          this.handleServerError(req, res, error);
        }
      });
      
      // Bind to all interfaces for better accessibility
      const bindHost = this.config.dashboardBindAll ? '0.0.0.0' : 'localhost';
      
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(this.config.dashboardPort, bindHost, () => {
          this.log('info', `📊 Web dashboard started on http://${bindHost}:${this.config.dashboardPort}`);
          this.log('info', `🌐 CORS enabled for origins: ${this.config.dashboardCorsOrigins || '*'}`);
          if (bindHost === '0.0.0.0') {
            this.log('info', `🔓 Dashboard accessible from any IP address`);
          }
          server.removeListener('error', reject);
          resolve();
        });
      });
      
      this.dashboardServer = server;
      
    } catch (error) {
      this.log('error', 'Failed to start web dashboard', { error: error.message });
    }
  }

  /**
   * Get allowed CORS origin based on request
   */
  getAllowedOrigin(req) {
    const origin = req.headers.origin;
    const corsOrigins = this.config.dashboardCorsOrigins;
    
    // If no specific origins configured, allow all
    if (!corsOrigins) {
      return '*';
    }
    
    // If origins is a string, split by comma
    const allowedOrigins = typeof corsOrigins === 'string' 
      ? corsOrigins.split(',').map(o => o.trim())
      : corsOrigins;
    
    // Check if request origin is in allowed list
    if (origin && allowedOrigins.includes(origin)) {
      return origin;
    }
    
    // Default fallback
    return allowedOrigins.includes('*') ? '*' : allowedOrigins[0] || 'http://localhost:8556';
  }

  /**
   * Handle status endpoint (/status)
   */
  handleStatusEndpoint(req, res) {
    const dashboardData = {
      agent: {
        status: this.isRunning ? 'running' : 'stopped',
        isPaused: this.isPaused,
        uptimeSeconds: this.stats.uptime
      },
      services: this.serviceState,
      statistics: this.stats,
      lastHealthCheck: this.lastHealthCheck,
      portCompliance: this.config.portCompliance,
      timestamp: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(dashboardData, null, 2));
  }

  /**
   * Handle health endpoint (/health)
   */
  handleHealthEndpoint(req, res) {
    const healthData = {
      status: this.isRunning ? 'healthy' : 'stopped',
      services: Object.keys(this.serviceState).reduce((acc, service) => {
        acc[service] = this.serviceState[service].isHealthy ? 'healthy' : 'unhealthy';
        return acc;
      }, {}),
      uptime: this.stats.uptime,
      lastCheck: this.lastHealthCheck,
      timestamp: new Date().toISOString()
    };
    
    const isHealthy = Object.values(healthData.services).every(status => status === 'healthy');
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(isHealthy ? 200 : 503);
    res.end(JSON.stringify(healthData, null, 2));
  }

  /**
   * Handle services endpoint (/services)
   */
  handleServicesEndpoint(req, res) {
    const servicesData = {
      services: this.serviceState,
      restartAttempts: this.restartAttempts,
      timestamp: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(servicesData, null, 2));
  }

  /**
   * Handle statistics endpoint (/statistics)
   */
  handleStatisticsEndpoint(req, res) {
    const statsData = {
      statistics: this.stats,
      uptime: this.stats.uptime,
      averageUptime: this.stats.averageUptime,
      timestamp: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(statsData, null, 2));
  }

  /**
   * Handle logs endpoint (/logs)
   */
  handleLogsEndpoint(req, res, query) {
    try {
      const fs = require('fs');
      const lines = parseInt(query.lines) || 50;
      const level = query.level || 'all';
      
      if (fs.existsSync(this.config.logFile)) {
        const logContent = fs.readFileSync(this.config.logFile, 'utf8');
        const logLines = logContent.split('\n')
          .filter(line => line.trim())
          .slice(-lines)
          .map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return { message: line, level: 'info', timestamp: new Date().toISOString() };
            }
          });
        
        const filteredLogs = level === 'all' 
          ? logLines 
          : logLines.filter(log => log.level.toLowerCase() === level.toLowerCase());
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ logs: filteredLogs, count: filteredLogs.length }, null, 2));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Log file not found' }, null, 2));
      }
    } catch (error) {
      this.handleServerError(req, res, error);
    }
  }

  /**
   * Handle config endpoint (/config)
   */
  handleConfigEndpoint(req, res) {
    // Return sanitized config (remove sensitive info)
    const sanitizedConfig = { ...this.config };
    
    // Remove sensitive information
    if (sanitizedConfig.notifications) {
      if (sanitizedConfig.notifications.email && sanitizedConfig.notifications.email.auth) {
        sanitizedConfig.notifications.email.auth.pass = '***hidden***';
      }
      if (sanitizedConfig.notifications.slack && sanitizedConfig.notifications.slack.webhookUrl) {
        sanitizedConfig.notifications.slack.webhookUrl = sanitizedConfig.notifications.slack.webhookUrl.replace(/\/[^\/]+$/, '/***hidden***');
      }
    }
    
    const configData = {
      configuration: sanitizedConfig,
      timestamp: new Date().toISOString()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(configData, null, 2));
  }

  /**
   * Handle restart endpoint (/restart)
   */
  handleRestartEndpoint(req, res, query) {
    if (req.method !== 'POST') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }, null, 2));
      return;
    }
    
    const type = query.type || 'quick';
    const service = query.service;
    
    // Trigger restart asynchronously
    setImmediate(async () => {
      try {
        if (service) {
          this.log('info', `🔄 Manual restart requested for ${service} via API`);
          // Restart specific service logic would go here
        } else if (type === 'quick') {
          this.log('info', '⚡ Manual quick restart requested via API');
          await this.performQuickRestart(['backend', 'frontend']);
        } else if (type === 'full') {
          this.log('info', '🔄 Manual full restart requested via API');
          await this.performFullRestart(['postgresql', 'redis', 'backend', 'frontend']);
        }
      } catch (error) {
        this.log('error', 'API-triggered restart failed', { error: error.message });
      }
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(202); // Accepted
    res.end(JSON.stringify({ 
      message: `Restart ${type} initiated`, 
      service: service || 'all',
      timestamp: new Date().toISOString() 
    }, null, 2));
  }

  /**
   * Handle 404 errors
   */
  handleNotFound(req, res) {
    const availableEndpoints = {
      endpoints: [
        'GET /',
        'GET /status',
        'GET /health', 
        'GET /services',
        'GET /statistics',
        'GET /logs?lines=50&level=all',
        'GET /config',
        'POST /restart?type=quick|full&service=serviceName'
      ],
      documentation: 'https://github.com/your-repo/service-monitor-agent'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(404);
    res.end(JSON.stringify({ 
      error: 'Endpoint not found', 
      path: req.url,
      ...availableEndpoints 
    }, null, 2));
  }

  /**
   * Handle server errors
   */
  handleServerError(req, res, error) {
    this.log('error', 'Dashboard server error', { 
      path: req.url, 
      method: req.method, 
      error: error.message 
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(500);
    res.end(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message,
      timestamp: new Date().toISOString()
    }, null, 2));
  }

  /**
   * Send critical notification
   */
  async sendCriticalNotification(alertData) {
    // This could be extended to send emails, Slack messages, etc.
    this.log('info', '📧 Critical notification triggered (extend this method for actual notifications)');
    
    // For now, just log the critical data
    console.log('\n' + '='.repeat(80));
    console.log('🚨 CRITICAL SERVICE MONITOR ALERT 🚨');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${alertData.timestamp}`);
    console.log(`Unhealthy Services: ${alertData.unhealthyServices.join(', ')}`);
    console.log('\nRecommendations:');
    alertData.recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Pause monitoring
   */
  pauseMonitoring() {
    this.isPaused = true;
    this.log('info', '⏸️  Monitoring paused');
  }

  /**
   * Resume monitoring
   */
  resumeMonitoring() {
    this.isPaused = false;
    this.log('info', '▶️  Monitoring resumed');
  }

  /**
   * Stop the monitoring agent
   */
  async stop() {
    if (!this.isRunning) {
      this.log('warn', 'Agent is not running');
      return;
    }

    this.log('info', '🛑 Stopping Service Monitor Agent...');
    this.isRunning = false;

    // Clear monitoring intervals
    for (const [name, interval] of Object.entries(this.monitoringIntervals)) {
      clearInterval(interval);
      this.log('debug', `Cleared ${name} interval`);
    }
    this.monitoringIntervals = {};

    // Stop web dashboard
    if (this.dashboardServer) {
      this.dashboardServer.close();
      this.log('info', '📊 Web dashboard stopped');
    }

    // Cleanup restarter
    if (this.restarter && typeof this.restarter.cleanup === 'function') {
      this.restarter.cleanup();
    }

    this.log('info', '✅ Service Monitor Agent stopped');
    await this.cleanupPidFile();

    // Final statistics log
    this.log('info', '📊 Final Statistics:', {
      totalChecks: this.stats.totalChecks,
      failedChecks: this.stats.failedChecks,
      quickRestarts: this.stats.quickRestarts,
      fullRestarts: this.stats.fullRestarts,
      uptimeSeconds: this.stats.uptime
    });
  }

  async cleanupPidFile() {
    try {
      if (fs.existsSync(PID_FILE)) {
        const recordedPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        if (Number.isInteger(recordedPid) && recordedPid === process.pid) {
          fs.unlinkSync(PID_FILE);
          this.log('debug', `Removed PID file ${PID_FILE}`);
        }
      }
    } catch (error) {
      this.log('debug', 'PID cleanup failed', { error: error.message });
    }
  }

  writePidFile() {
    try {
      fs.writeFileSync(PID_FILE, process.pid.toString());
      this.log('debug', `PID file written to ${PID_FILE}`);
    } catch (error) {
      this.log('error', 'Failed to write PID file', { error: error.message });
      throw error;
    }
  }

  async ensureSingleInstance() {
    const replaced = await this.terminateExistingInstance('Replacing existing agent instance');
    if (replaced) {
      this.log('warn', 'Previous Service Monitor Agent instance terminated before startup');
    }
    this.writePidFile();
  }

  async terminateExistingInstance(reason = 'Manual termination requested') {
    try {
      if (!fs.existsSync(PID_FILE)) {
        return false;
      }

      const recordedPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      if (!recordedPid || recordedPid === process.pid) {
        fs.unlinkSync(PID_FILE);
        return false;
      }

      const running = await this.isProcessRunning(recordedPid);
      if (!running) {
        fs.unlinkSync(PID_FILE);
        return false;
      }

      this.log('warn', `${reason}. Terminating PID ${recordedPid}`);
      await this.terminateProcess(recordedPid, reason);
      await this.waitForProcessExit(recordedPid);
      fs.unlinkSync(PID_FILE);
      return true;
    } catch (error) {
      this.log('error', 'Failed to terminate existing agent instance', { error: error.message });
      throw error;
    }
  }

  async ensureDashboardPortAvailable(port) {
    const pid = await this.findProcessOnPort(port);
    if (!pid || pid === process.pid) {
      return;
    }

    this.log('warn', `Dashboard port ${port} occupied by PID ${pid}. Terminating...`);
    await this.terminateProcess(pid, `Freeing dashboard port ${port}`);
    await this.waitForProcessExit(pid);

    const stillRunning = await this.findProcessOnPort(port);
    if (stillRunning) {
      throw new Error(`Port ${port} still occupied by PID ${stillRunning}`);
    }
  }

  async isProcessRunning(pid) {
    if (!pid) {
      return false;
    }

    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}"`);
        return stdout && stdout.includes(pid.toString());
      }

      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  async terminateProcess(pid, reason = '') {
    if (!pid || pid <= 0 || pid === 1) {
      throw new Error(`Refusing to terminate critical PID ${pid}`);
    }

    if (process.platform === 'win32') {
      await execAsync(`taskkill /PID ${pid} /T /F`);
    } else {
      process.kill(pid, 'SIGTERM');
    }

    this.log('info', `✅ Terminated process ${pid}${reason ? ` (${reason})` : ''}`);
  }

  async waitForProcessExit(pid, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const running = await this.isProcessRunning(pid);
      if (!running) {
        return;
      }
      await this.sleep(500);
    }
    throw new Error(`Process ${pid} did not exit within ${timeoutMs}ms`);
  }

  async findProcessOnPort(port) {
    try {
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      if (!stdout) {
        return null;
      }

      const lines = stdout.split('\n').map(line => line.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split(/\s+/);
        const localAddress = parts[1];
        const pidPart = parts[parts.length - 1];
        if (localAddress && localAddress.endsWith(`:${port}`)) {
          const pid = parseInt(pidPart, 10);
          if (Number.isInteger(pid)) {
            return pid;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Find an available port
   */
  async findAvailablePort(startPort) {
    let port = startPort;
    while (!await this.isPortAvailable(port)) {
      port++;
    }
    return port;
  }

}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  
  console.log('🤖 Service Monitor Agent');
  console.log('=========================\n');

  if (args.includes('--help') || args.includes('-h')) {
    console.log('📋 Available commands:');
    console.log('  --start, -s              Start the monitoring agent');
    console.log('  --stop                   Stop the running monitoring agent');
    console.log('  --restart                Restart the monitoring agent');
    console.log('  --config [file]          Load configuration from file');
    console.log('  --interval [ms]          Set health check interval (default: 30000)');
    console.log('  --dashboard-port [port]  Set dashboard port (default: 8577)');
    console.log('  --log-level [level]      Set log level (debug|info|warn|error)');
    console.log('  --no-dashboard           Disable web dashboard');
    console.log('  --no-auto-start          Disable auto-start on boot');
    console.log('\nExamples:');
    console.log('  node service-monitor-agent.js --start');
    console.log('  node service-monitor-agent.js --start --interval 60000 --log-level debug');
    console.log('  node service-monitor-agent.js --start --no-dashboard --no-auto-start');
    return;
  }

  // Parse configuration from command line
  const config = {};
  
  const intervalIndex = args.findIndex(arg => arg === '--interval');
  if (intervalIndex !== -1 && args[intervalIndex + 1]) {
    config.healthCheckInterval = parseInt(args[intervalIndex + 1]);
  }
  
  const dashboardPortIndex = args.findIndex(arg => arg === '--dashboard-port');
  if (dashboardPortIndex !== -1 && args[dashboardPortIndex + 1]) {
    config.dashboardPort = parseInt(args[dashboardPortIndex + 1]);
  }
  
  const logLevelIndex = args.findIndex(arg => arg === '--log-level');
  if (logLevelIndex !== -1 && args[logLevelIndex + 1]) {
    config.logLevel = args[logLevelIndex + 1];
  }
  
  if (args.includes('--no-dashboard')) {
    config.enableDashboard = false;
  }
  
  if (args.includes('--no-auto-start')) {
    config.autoStartOnBoot = false;
  }

  // Load config file if specified
  const configIndex = args.findIndex(arg => arg === '--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    try {
      const configFile = require(path.resolve(args[configIndex + 1]));
      Object.assign(config, configFile);
      console.log(`✅ Configuration loaded from ${args[configIndex + 1]}`);
    } catch (error) {
      console.error(`❌ Failed to load config file: ${error.message}`);
      process.exit(1);
    }
  }

  const wantsStop = args.includes('--stop');
  const wantsRestart = args.includes('--restart');
  const wantsStart = args.includes('--start') || args.includes('-s');

  if (!wantsStart && !wantsStop && !wantsRestart) {
    console.log('❌ Please specify --start, --stop, or --restart');
    console.log('Use --help for available options');
    return;
  }

  const agent = new ServiceMonitorAgent(config);

  if (wantsStop) {
    const terminated = await agent.terminateExistingInstance('Manual stop command');
    if (terminated) {
      console.log('✅ Existing Service Monitor Agent instance terminated');
    } else {
      console.log('ℹ️  No running Service Monitor Agent instance found');
    }
    await agent.cleanupPidFile();
    return;
  }

  if (wantsRestart) {
    await agent.terminateExistingInstance('Restart command');
    await agent.cleanupPidFile();
    await agent.start();
  } else if (wantsStart) {
    await agent.start();
  }

  // Keep the process running for start/restart commands
  process.on('SIGINT', async () => {
    console.log('\n👋 Shutting down Service Monitor Agent...');
    await agent.stop();
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Agent startup error:', error.message);
    process.exit(1);
  });
}

module.exports = { ServiceMonitorAgent };