#!/usr/bin/env node

/**
 * Graceful Shutdown Script
 * Properly stops all services in the correct order
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const { ServiceDetector, SERVICE_CONFIG } = require('./services-detector.js');

console.log('🛑 Graceful Shutdown System');
console.log('==========================\n');

class GracefulShutdown {
  constructor() {
    this.detector = new ServiceDetector();
    this.shutdownOrder = [
      'frontend',    // Stop frontend first (least critical)
      'backend',     // Stop backend next (depends on DB)
      'redis',       // Stop Redis (cache can be lost)
      'postgresql'   // Stop database last (most critical)
    ];
  }

  /**
   * Stop a specific service gracefully
   */
  async stopService(serviceName) {
    const service = this.detector.services[serviceName];
    if (!service) {
      console.log(`⚠️  Unknown service: ${serviceName}`);
      return false;
    }

    console.log(`🛑 Stopping ${serviceName.toUpperCase()}...`);

    try {
      const portCheck = await this.detector.isPortInUse(service.port);
      
      if (!portCheck.inUse) {
        console.log(`✅ ${serviceName.toUpperCase()} is already stopped`);
        return true;
      }

      // Service-specific shutdown procedures
      switch (serviceName) {
        case 'postgresql':
          return await this.stopPostgreSQL(portCheck.pid);
        
        case 'redis':
          return await this.stopRedis(portCheck.pid);
        
        case 'backend':
        case 'frontend':
          return await this.stopNodeService(serviceName, portCheck.pid);
        
        default:
          return await this.stopGenericService(serviceName, service.port, portCheck.pid);
      }

    } catch (error) {
      console.log(`❌ Error stopping ${serviceName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop PostgreSQL gracefully
   */
  async stopPostgreSQL(pid) {
    try {
      // Try graceful shutdown first using pg_ctl
      console.log('   Attempting graceful PostgreSQL shutdown...');
      
      try {
        const stopCommand = `"${SERVICE_CONFIG.POSTGRES_PATH}" -D "${SERVICE_CONFIG.POSTGRES_DATA_DIR}" stop -m fast`;
        await execAsync(stopCommand);
        
        // Wait for graceful shutdown
        await this.sleep(3000);
        
        // Verify it stopped
        const stillRunning = await this.detector.isPortInUse(SERVICE_CONFIG.POSTGRESQL_PORT);
        if (!stillRunning.inUse) {
          console.log('✅ PostgreSQL stopped gracefully');
          return true;
        }
      } catch (pgCtlError) {
        console.log(`   pg_ctl failed: ${pgCtlError.message}`);
      }

      // Try Windows service stop
      try {
        console.log('   Attempting Windows service stop...');
        await execAsync('net stop postgresql-x64-15');
        await this.sleep(3000);
        
        const stillRunning = await this.detector.isPortInUse(SERVICE_CONFIG.POSTGRESQL_PORT);
        if (!stillRunning.inUse) {
          console.log('✅ PostgreSQL stopped via Windows service');
          return true;
        }
      } catch (serviceError) {
        console.log(`   Service stop failed: ${serviceError.message}`);
      }

      // Force kill as last resort
      if (pid) {
        console.log('   Force killing PostgreSQL processes...');
        await execAsync('taskkill /F /IM postgres.exe');
        await this.sleep(2000);
        
        const stillRunning = await this.detector.isPortInUse(SERVICE_CONFIG.POSTGRESQL_PORT);
        if (!stillRunning.inUse) {
          console.log('⚠️  PostgreSQL force-killed (not ideal but necessary)');
          return true;
        }
      }

      console.log('❌ Failed to stop PostgreSQL');
      return false;

    } catch (error) {
      console.log(`❌ PostgreSQL shutdown error: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop Redis gracefully
   */
  async stopRedis(pid) {
    try {
      // Try Redis SHUTDOWN command first
      console.log('   Attempting graceful Redis shutdown...');
      
      try {
        await execAsync(`echo "SHUTDOWN" | redis-cli -p ${SERVICE_CONFIG.REDIS_PORT}`);
        await this.sleep(2000);
        
        const stillRunning = await this.detector.isPortInUse(SERVICE_CONFIG.REDIS_PORT);
        if (!stillRunning.inUse) {
          console.log('✅ Redis stopped gracefully');
          return true;
        }
      } catch (redisError) {
        console.log(`   Redis SHUTDOWN failed: ${redisError.message}`);
      }

      // Force kill if graceful shutdown failed
      if (pid) {
        console.log('   Force killing Redis process...');
        await execAsync(`taskkill /F /PID ${pid}`);
        await this.sleep(1000);
        
        const stillRunning = await this.detector.isPortInUse(SERVICE_CONFIG.REDIS_PORT);
        if (!stillRunning.inUse) {
          console.log('⚠️  Redis force-killed');
          return true;
        }
      }

      console.log('❌ Failed to stop Redis');
      return false;

    } catch (error) {
      console.log(`❌ Redis shutdown error: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop Node.js services (backend/frontend)
   */
  async stopNodeService(serviceName, pid) {
    try {
      if (pid) {
        console.log(`   Stopping ${serviceName} process (PID: ${pid})...`);
        
        // Try graceful termination first (SIGTERM equivalent on Windows)
        try {
          await execAsync(`taskkill /PID ${pid}`);
          await this.sleep(2000);
          
          const stillRunning = await this.detector.isPortInUse(
            serviceName === 'backend' ? SERVICE_CONFIG.BACKEND_PORT : SERVICE_CONFIG.FRONTEND_PORT
          );
          
          if (!stillRunning.inUse) {
            console.log(`✅ ${serviceName.toUpperCase()} stopped gracefully`);
            return true;
          }
        } catch (gracefulError) {
          console.log(`   Graceful termination failed: ${gracefulError.message}`);
        }

        // Force kill if graceful termination failed
        console.log(`   Force killing ${serviceName} process...`);
        await execAsync(`taskkill /F /PID ${pid}`);
        await this.sleep(1000);
        
        const stillRunning = await this.detector.isPortInUse(
          serviceName === 'backend' ? SERVICE_CONFIG.BACKEND_PORT : SERVICE_CONFIG.FRONTEND_PORT
        );
        
        if (!stillRunning.inUse) {
          console.log(`⚠️  ${serviceName.toUpperCase()} force-killed`);
          return true;
        }
      }

      console.log(`❌ Failed to stop ${serviceName}`);
      return false;

    } catch (error) {
      console.log(`❌ ${serviceName} shutdown error: ${error.message}`);
      return false;
    }
  }

  /**
   * Stop generic service by port
   */
  async stopGenericService(serviceName, port, pid) {
    try {
      if (pid) {
        console.log(`   Killing process on port ${port} (PID: ${pid})...`);
        await execAsync(`taskkill /F /PID ${pid}`);
        await this.sleep(1000);
        
        const stillRunning = await this.detector.isPortInUse(port);
        if (!stillRunning.inUse) {
          console.log(`✅ ${serviceName.toUpperCase()} stopped`);
          return true;
        }
      }

      console.log(`❌ Failed to stop ${serviceName}`);
      return false;

    } catch (error) {
      console.log(`❌ ${serviceName} shutdown error: ${error.message}`);
      return false;
    }
  }

  /**
   * Shutdown all services in proper order
   */
  async shutdownAll() {
    console.log('🛑 Initiating graceful shutdown of all services...\n');
    
    const results = {};
    let allStopped = true;

    for (const serviceName of this.shutdownOrder) {
      const success = await this.stopService(serviceName);
      results[serviceName] = success;
      
      if (!success) {
        allStopped = false;
      }
      
      // Brief pause between service stops
      await this.sleep(1000);
    }

    console.log('\n📊 Shutdown Summary:');
    console.log('====================');
    
    for (const [service, success] of Object.entries(results)) {
      const status = success ? '✅ STOPPED' : '❌ FAILED';
      console.log(`${service.toUpperCase().padEnd(12)}: ${status}`);
    }

    if (allStopped) {
      console.log('\n🎉 All services stopped successfully!');
    } else {
      console.log('\n⚠️  Some services failed to stop. Manual intervention may be required.');
    }

    return { results, allStopped };
  }

  /**
   * Emergency shutdown - force kill everything
   */
  async emergencyShutdown() {
    console.log('🚨 EMERGENCY SHUTDOWN - Force killing all processes...\n');
    
    try {
      // Kill all Node.js processes
      console.log('💀 Killing all Node.js processes...');
      try {
        await execAsync('taskkill /F /IM node.exe');
      } catch (e) {
        console.log('   No Node.js processes found');
      }

      // Kill PostgreSQL
      console.log('💀 Killing PostgreSQL processes...');
      try {
        await execAsync('taskkill /F /IM postgres.exe');
      } catch (e) {
        console.log('   No PostgreSQL processes found');
      }

      // Kill Redis
      console.log('💀 Killing Redis processes...');
      try {
        await execAsync('taskkill /F /IM redis-server.exe');
      } catch (e) {
        console.log('   No Redis processes found');
      }

      await this.sleep(3000);

      console.log('\n⚠️  Emergency shutdown complete. Check service status manually.');
      
    } catch (error) {
      console.log(`❌ Emergency shutdown error: ${error.message}`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const shutdown = new GracefulShutdown();

  try {
    if (args.includes('--all') || args.includes('-a')) {
      await shutdown.shutdownAll();
    } else if (args.includes('--emergency') || args.includes('-e')) {
      await shutdown.emergencyShutdown();
    } else if (args.includes('--service') || args.includes('-s')) {
      const serviceIndex = Math.max(
        args.findIndex(arg => arg === '--service'),
        args.findIndex(arg => arg === '-s')
      );
      const serviceName = args[serviceIndex + 1];
      
      if (serviceName && ['postgresql', 'redis', 'backend', 'frontend'].includes(serviceName)) {
        await shutdown.stopService(serviceName);
      } else {
        console.log('❌ Please specify a valid service: postgresql, redis, backend, frontend');
      }
    } else {
      console.log('📋 Available commands:');
      console.log('  --all, -a              Shutdown all services gracefully');
      console.log('  --emergency, -e        Emergency shutdown (force kill all)');
      console.log('  --service, -s [name]   Shutdown specific service');
      console.log('\nService names: postgresql, redis, backend, frontend');
      console.log('\nExamples:');
      console.log('  node graceful-shutdown.js --all');
      console.log('  node graceful-shutdown.js --service postgresql');
      console.log('  node graceful-shutdown.js --emergency');
    }
  } catch (error) {
    console.error('❌ Shutdown error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { GracefulShutdown };