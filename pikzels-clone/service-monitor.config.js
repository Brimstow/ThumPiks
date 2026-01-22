/**
 * Service Monitor Agent Configuration
 * 
 * Customize monitoring behavior, restart policies, and alerting settings
 */

module.exports = {
  // === MONITORING INTERVALS ===
  
  // How often to check service health (milliseconds)
  healthCheckInterval: 30000, // 30 seconds (default)
  
  // How often to run deep diagnostics (milliseconds)
  deepHealthCheckInterval: 300000, // 5 minutes
  
  // Interval for retry attempts after failures (milliseconds)
  retryInterval: 10000, // 10 seconds
  
  // === RESTART POLICIES ===
  
  // Maximum number of quick restarts before escalating to full restart
  maxQuickRestarts: 2,
  
  // Maximum number of full restarts before manual intervention required
  maxFullRestarts: 3,
  
  // Cooldown period between restart attempts (milliseconds)
  cooldownPeriod: 60000, // 1 minute
  
  // === ALERTING THRESHOLDS ===
  
  // Send alert after this amount of downtime (milliseconds)
  alertOnDowntime: 60000, // 1 minute
  
  // Send critical alert after this amount of downtime (milliseconds)
  criticalDowntime: 300000, // 5 minutes
  
  // === LOGGING CONFIGURATION ===
  
  // Log level: 'debug', 'info', 'warn', 'error'
  logLevel: 'info',
  
  // Path to log file (relative to project root)
  logFile: 'logs/service-monitor.log',
  
  // === WEB DASHBOARD ===
  
  // Enable/disable web dashboard
  enableDashboard: true,
  
  // Port for web dashboard (must be in range 8500-8599)
  dashboardPort: 8578,
  
  // CORS settings for dashboard API
  dashboardCorsOrigins: [
    'http://localhost:8556',  // Frontend dev server
    'http://localhost:3000',  // Alternative React dev server
    'http://127.0.0.1:8556', // IP variant
    'http://127.0.0.1:3000'  // IP variant
  ],
  
  // Bind dashboard to all interfaces (0.0.0.0) instead of just localhost
  // Set to true for remote access, false for localhost only
  dashboardBindAll: false,
  
  // === STARTUP BEHAVIOR ===
  
  // Automatically start services if they're down when agent starts
  autoStartOnBoot: true,
  requireBDrivePaths: true,
  
  // === ADVANCED SETTINGS ===
  
  // Custom restart strategies per service
  serviceSettings: {
    postgresql: {
      // PostgreSQL-specific settings
      maxStartupTime: 30000, // 30 seconds
      healthCheckEndpoint: null, // No HTTP endpoint for PostgreSQL
      restartCommand: 'node smart-restart.js --postgresql'
    },
    redis: {
      // Redis-specific settings
      maxStartupTime: 10000, // 10 seconds
      healthCheckEndpoint: null, // No HTTP endpoint for Redis
      restartCommand: 'node smart-restart.js --redis'
    },
    backend: {
      // Backend API-specific settings
      maxStartupTime: 45000, // 45 seconds for backend compilation
      healthCheckEndpoint: '/health',
      restartCommand: 'npm run dev',
      criticalService: true // Backend is critical for app functionality
    },
    frontend: {
      // Frontend-specific settings
      maxStartupTime: 60000, // 60 seconds for Vite startup + build
      healthCheckEndpoint: '/',
      restartCommand: 'cd client && npm run dev',
      criticalService: false // Frontend can be down briefly
    }
  },
  
  // === NOTIFICATION SETTINGS ===
  
  // Email notifications (extend sendCriticalNotification method to implement)
  notifications: {
    email: {
      enabled: false,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'your-email@gmail.com',
          pass: 'your-app-password'
        }
      },
      to: ['admin@yourcompany.com'],
      from: 'service-monitor@yourcompany.com'
    },
    
    // Slack notifications
    slack: {
      enabled: false,
      webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK',
      channel: '#alerts',
      username: 'Service Monitor'
    },
    
    // Discord notifications
    discord: {
      enabled: false,
      webhookUrl: 'https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK'
    }
  },
  
  // === HEALTH CHECK CUSTOMIZATION ===
  
  // Custom health check URLs (override defaults)
  healthCheckUrls: {
    backend: 'http://localhost:8550/health',
    frontend: 'http://localhost:8556',
    // PostgreSQL and Redis use connection-based health checks
  },
  
  // Timeout for HTTP health checks (milliseconds)
  healthCheckTimeout: 5000,
  
  // === PERFORMANCE MONITORING ===
  
  // Enable performance monitoring
  enablePerformanceMonitoring: true,
  
  // Response time thresholds for alerts (milliseconds)
  performanceThresholds: {
    backend: 1000, // Alert if backend response > 1s
    frontend: 3000  // Alert if frontend response > 3s
  },
  
  // === SECURITY SETTINGS ===
  
  // Enable security monitoring
  enableSecurityMonitoring: true,
  
  // Monitor for suspicious port activity
  monitorPortSecurity: true,
  
  // Alert on unauthorized process binding to monitored ports
  alertOnUnauthorizedProcesses: true,
  
  // === DISASTER RECOVERY ===
  
  // Enable automatic backup before major restarts
  enableAutoBackup: false,
  
  // Backup directory
  backupDirectory: 'backups',
  
  // Services to backup (database, logs, etc.)
  backupServices: ['postgresql'],
  
  // === PORT COMPLIANCE RULES ===
  
  // CRITICAL: All ports MUST be in range 8500-8599 (per PORT-COMPLIANCE-RULES.md)
  portCompliance: {
    enforceRange: true,
    minPort: 8500,
    maxPort: 8599,
    requiredPorts: {
      postgresql: 8565,
      redis: 8520,
      backend: 8550,
      frontend: 8556
    },
    // Alert if any service tries to use ports outside this range
    strictCompliance: true,
    // Check for common conflicting ports
    forbiddenPorts: [3000, 5000, 8080],
    // B drive path validation (per WARP-RULES.md)
    bDriveFirst: true
  },
  
  // === DEVELOPMENT/PRODUCTION MODES ===
  
  // Environment mode affects restart strategies
  environment: 'development', // 'development' | 'production' | 'staging'
  
  // Production-specific overrides
  production: {
    healthCheckInterval: 60000, // Check every minute in production
    maxQuickRestarts: 1, // Be more conservative in production
    maxFullRestarts: 2,
    cooldownPeriod: 600000, // 10 minutes cooldown in production
    alertOnDowntime: 30000, // Alert after 30 seconds in production
    criticalDowntime: 180000, // Critical after 3 minutes in production
    logLevel: 'warn' // Less verbose logging in production
  },
  
  // Development-specific overrides
  development: {
    healthCheckInterval: 30000, // More frequent checks in development
    maxQuickRestarts: 3, // Allow more restarts in development
    maxFullRestarts: 5,
    logLevel: 'debug' // Verbose logging in development
  }
};