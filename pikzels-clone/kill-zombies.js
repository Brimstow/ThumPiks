#!/usr/bin/env node

/**
 * Kill Zombie Node Processes
 * 
 * Finds and kills orphaned Node processes holding ports 8500-8599
 * Usage: node kill-zombies.js [--all] [--port 8556]
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const SERVICE_PORTS = {
  postgresql: 8565,
  redis: 8520,
  backend: 8550,
  frontend: 8556,
  monitor: 8577,
  dashboard: 8578
};

const PORT_RANGE = {
  min: 8500,
  max: 8599
};

async function findProcessOnPort(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr ":${port}"`);
    const lines = stdout.trim().split('\n');
    const pids = new Set();
    
    for (const line of lines) {
      const match = line.match(/LISTENING\s+(\d+)/);
      if (match) {
        pids.add(match[1]);
      }
    }
    
    return Array.from(pids);
  } catch (error) {
    return [];
  }
}

async function killProcess(pid, serviceName = 'process') {
  try {
    await execAsync(`taskkill /F /PID ${pid}`);
    console.log(`✅ Killed ${serviceName} (PID: ${pid})`);
    return true;
  } catch (error) {
    if (error.message.includes('not found')) {
      console.log(`ℹ️  Process ${pid} already terminated`);
      return true;
    }
    console.log(`❌ Failed to kill PID ${pid}: ${error.message}`);
    return false;
  }
}

async function killZombiesOnPort(port, serviceName) {
  console.log(`\n🔍 Checking port ${port} (${serviceName})...`);
  const pids = await findProcessOnPort(port);
  
  if (pids.length === 0) {
    console.log(`   ✅ Port ${port} is free`);
    return 0;
  }
  
  console.log(`   ⚠️  Found ${pids.length} process(es) on port ${port}`);
  let killed = 0;
  
  for (const pid of pids) {
    if (await killProcess(pid, serviceName)) {
      killed++;
    }
  }
  
  return killed;
}

async function killAllServiceZombies() {
  console.log('🧟 Zombie Process Killer');
  console.log('========================\n');
  
  let totalKilled = 0;
  
  for (const [serviceName, port] of Object.entries(SERVICE_PORTS)) {
    const killed = await killZombiesOnPort(port, serviceName);
    totalKilled += killed;
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Summary: Killed ${totalKilled} zombie process(es)`);
  
  if (totalKilled > 0) {
    console.log('✅ All ports should now be free');
  } else {
    console.log('✅ No zombies found - all ports are clean!');
  }
}

async function killZombiesInRange() {
  console.log('🧟 Scanning entire port range (8500-8599)...\n');
  
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr "LISTENING"`);
    const lines = stdout.trim().split('\n');
    const zombies = new Map();
    
    for (const line of lines) {
      const portMatch = line.match(/:(\d+)\s/);
      const pidMatch = line.match(/LISTENING\s+(\d+)/);
      
      if (portMatch && pidMatch) {
        const port = parseInt(portMatch[1]);
        const pid = pidMatch[1];
        
        if (port >= PORT_RANGE.min && port <= PORT_RANGE.max) {
          if (!zombies.has(port)) {
            zombies.set(port, []);
          }
          zombies.get(port).push(pid);
        }
      }
    }
    
    if (zombies.size === 0) {
      console.log('✅ No processes found in port range 8500-8599');
      return;
    }
    
    console.log(`⚠️  Found processes on ${zombies.size} ports:\n`);
    let totalKilled = 0;
    
    for (const [port, pids] of zombies.entries()) {
      const serviceName = Object.entries(SERVICE_PORTS)
        .find(([_, p]) => p === port)?.[0] || 'unknown';
      
      console.log(`Port ${port} (${serviceName}): ${pids.join(', ')}`);
      
      for (const pid of pids) {
        if (await killProcess(pid, serviceName)) {
          totalKilled++;
        }
      }
    }
    
    console.log(`\n✅ Killed ${totalKilled} process(es) in range 8500-8599`);
    
  } catch (error) {
    console.log('ℹ️  No processes found in port range');
  }
}

async function killSpecificPort(port) {
  console.log(`🎯 Targeting port ${port}...\n`);
  const killed = await killZombiesOnPort(port, `port ${port}`);
  
  if (killed > 0) {
    console.log(`\n✅ Port ${port} is now free`);
  } else {
    console.log(`\nℹ️  Port ${port} was already free`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧟 Zombie Process Killer

Usage:
  node kill-zombies.js              Kill zombies on all service ports
  node kill-zombies.js --all        Scan and kill all processes in range 8500-8599
  node kill-zombies.js --port 8556  Kill zombie on specific port
  node kill-zombies.js --help       Show this help

Examples:
  node kill-zombies.js              # Kill zombies on known service ports
  node kill-zombies.js --all        # Nuclear option - kill everything in range
  node kill-zombies.js --port 8556  # Kill only frontend zombies
`);
    return;
  }
  
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1]);
    if (isNaN(port)) {
      console.error('❌ Invalid port number');
      process.exit(1);
    }
    await killSpecificPort(port);
  } else if (args.includes('--all')) {
    await killZombiesInRange();
  } else {
    await killAllServiceZombies();
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
