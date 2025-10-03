#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Security Scanning Script
 * Runs multiple security checks and generates a report
 */

class SecurityScanner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      scans: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  async runAllScans() {
    console.log('🔒 Starting comprehensive security scan...\n');

    // 1. Dependency vulnerability scan
    await this.scanDependencies();

    // 2. Code security analysis
    await this.scanCode();

    // 3. Configuration security check
    await this.scanConfiguration();

    // 4. Environment security check
    await this.scanEnvironment();

    // 5. Git security check
    await this.scanGit();

    // Generate report
    this.generateReport();
    
    console.log('\n✅ Security scan completed');
    return this.results;
  }

  async scanDependencies() {
    console.log('📦 Scanning dependencies for vulnerabilities...');
    
    try {
      // NPM Audit
      const npmAudit = await this.execCommand('npm audit --json');
      const auditData = JSON.parse(npmAudit);
      
      this.results.scans.dependencies = {
        status: auditData.metadata.vulnerabilities.total > 0 ? 'FAIL' : 'PASS',
        vulnerabilities: auditData.metadata.vulnerabilities,
        details: auditData.advisories || {}
      };

      if (auditData.metadata.vulnerabilities.total > 0) {
        console.log(`⚠️  Found ${auditData.metadata.vulnerabilities.total} dependency vulnerabilities`);
        this.results.summary.failed++;
      } else {
        console.log('✅ No dependency vulnerabilities found');
        this.results.summary.passed++;
      }
    } catch (error) {
      console.log('❌ Dependency scan failed:', error.message);
      this.results.scans.dependencies = {
        status: 'ERROR',
        error: error.message
      };
      this.results.summary.failed++;
    }

    this.results.summary.total++;
  }

  async scanCode() {
    console.log('🔍 Scanning code for security issues...');
    
    const securityIssues = [];
    
    try {
      // Check for hardcoded secrets
      const secretPatterns = [
        { name: 'Hardcoded API Keys', pattern: /["'][a-zA-Z0-9]{32,}["']/, exclude: ['generated', 'node_modules'] },
        { name: 'Private Keys', pattern: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
        { name: 'Hardcoded JWT Secrets', pattern: /jwt[_-]?secret["']\s*:\s*["'][^"']{8,}["']/ },
        { name: 'Database Credentials', pattern: /postgresql:\/\/[^:]+:[^@]+@/ },
        { name: 'Email Passwords', pattern: /email[_-]?password["']\s*:\s*["'][^"']+["']/ }
      ];

      const codeFiles = this.getCodeFiles();
      
      for (const file of codeFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of secretPatterns) {
          if (pattern.pattern.test(content) && 
              !file.includes('.example') && 
              !file.includes('generated') && 
              !file.includes('node_modules') &&
              !(pattern.exclude && pattern.exclude.some(ex => file.includes(ex)))) {
            securityIssues.push({
              type: pattern.name,
              file: file,
              severity: 'HIGH'
            });
          }
        }
      }

      // Check for insecure patterns
      const insecurePatterns = [
        { name: 'eval() usage', pattern: /\beval\s*\(/, severity: 'HIGH' },
        { name: 'innerHTML usage', pattern: /innerHTML\s*=/, severity: 'MEDIUM' },
        { name: 'document.write usage', pattern: /document\.write\s*\(/, severity: 'HIGH' },
        { name: 'Weak crypto', pattern: /crypto\.createHash\(['"]md5['"]/, severity: 'MEDIUM' }
      ];

      for (const file of codeFiles) {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of insecurePatterns) {
          if (pattern.pattern.test(content) && !file.includes('security-scan.js')) {
            securityIssues.push({
              type: pattern.name,
              file: file,
              severity: pattern.severity
            });
          }
        }
      }

      this.results.scans.code = {
        status: securityIssues.length > 0 ? 'FAIL' : 'PASS',
        issues: securityIssues,
        filesScanned: codeFiles.length
      };

      if (securityIssues.length > 0) {
        console.log(`⚠️  Found ${securityIssues.length} code security issues`);
        this.results.summary.failed++;
      } else {
        console.log('✅ No code security issues found');
        this.results.summary.passed++;
      }
    } catch (error) {
      console.log('❌ Code scan failed:', error.message);
      this.results.scans.code = {
        status: 'ERROR',
        error: error.message
      };
      this.results.summary.failed++;
    }

    this.results.summary.total++;
  }

  async scanConfiguration() {
    console.log('⚙️  Scanning configuration security...');
    
    const configIssues = [];

    try {
      // Check package.json security
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for dev dependencies in production
      if (packageJson.dependencies) {
        const devPackagesInProd = Object.keys(packageJson.dependencies).filter(pkg => 
          pkg.includes('test') || pkg.includes('dev') || pkg.includes('mock')
        );
        
        if (devPackagesInProd.length > 0) {
          configIssues.push({
            type: 'Dev packages in production dependencies',
            packages: devPackagesInProd,
            severity: 'MEDIUM'
          });
        }
      }

      // Check for missing security scripts
      const requiredScripts = ['audit', 'security:scan'];
      const missingScripts = requiredScripts.filter(script => 
        !packageJson.scripts || !packageJson.scripts[script]
      );
      
      if (missingScripts.length > 0) {
        configIssues.push({
          type: 'Missing security scripts',
          scripts: missingScripts,
          severity: 'LOW'
        });
      }

      // Check Docker configuration if exists
      if (fs.existsSync('Dockerfile')) {
        const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
        
        if (dockerfile.includes('USER root')) {
          configIssues.push({
            type: 'Docker running as root user',
            severity: 'HIGH'
          });
        }
        
        if (!dockerfile.includes('USER ')) {
          configIssues.push({
            type: 'Docker not specifying non-root user',
            severity: 'MEDIUM'
          });
        }
      }

      this.results.scans.configuration = {
        status: configIssues.length > 0 ? 'WARN' : 'PASS',
        issues: configIssues
      };

      if (configIssues.length > 0) {
        console.log(`⚠️  Found ${configIssues.length} configuration issues`);
        this.results.summary.warnings++;
      } else {
        console.log('✅ Configuration security looks good');
        this.results.summary.passed++;
      }
    } catch (error) {
      console.log('❌ Configuration scan failed:', error.message);
      this.results.scans.configuration = {
        status: 'ERROR',
        error: error.message
      };
      this.results.summary.failed++;
    }

    this.results.summary.total++;
  }

  async scanEnvironment() {
    console.log('🌍 Scanning environment security...');
    
    const envIssues = [];

    try {
      // Check for .env file in git
      if (fs.existsSync('.env')) {
        envIssues.push({
          type: '.env file present (should not be committed)',
          severity: 'HIGH'
        });
      }

      // Check .gitignore
      if (fs.existsSync('.gitignore')) {
        const gitignore = fs.readFileSync('.gitignore', 'utf8');
        const requiredIgnores = ['.env', '.env.local', '.env.*.local', 'logs/', '*.log'];
        
        const missingIgnores = requiredIgnores.filter(ignore => 
          !gitignore.includes(ignore)
        );
        
        if (missingIgnores.length > 0) {
          envIssues.push({
            type: 'Missing security-related .gitignore entries',
            missing: missingIgnores,
            severity: 'MEDIUM'
          });
        }
      } else {
        envIssues.push({
          type: 'Missing .gitignore file',
          severity: 'HIGH'
        });
      }

      // Check for .env.example
      if (!fs.existsSync('.env.example')) {
        envIssues.push({
          type: 'Missing .env.example file',
          severity: 'LOW'
        });
      }

      this.results.scans.environment = {
        status: envIssues.length > 0 ? 'WARN' : 'PASS',
        issues: envIssues
      };

      if (envIssues.length > 0) {
        console.log(`⚠️  Found ${envIssues.length} environment issues`);
        this.results.summary.warnings++;
      } else {
        console.log('✅ Environment security looks good');
        this.results.summary.passed++;
      }
    } catch (error) {
      console.log('❌ Environment scan failed:', error.message);
      this.results.scans.environment = {
        status: 'ERROR',
        error: error.message
      };
      this.results.summary.failed++;
    }

    this.results.summary.total++;
  }

  async scanGit() {
    console.log('📝 Scanning git security...');
    
    const gitIssues = [];

    try {
      // Check for secrets in git history
      const gitLog = await this.execCommand('git log --all --full-history -- "*.env*" || echo "No env files in history"');
      
      if (gitLog && !gitLog.includes('No env files in history')) {
        gitIssues.push({
          type: 'Environment files found in git history',
          severity: 'HIGH',
          recommendation: 'Use git filter-branch to remove sensitive files from history'
        });
      }

      // Check for large files that might contain secrets (Windows compatible)
      let largeFiles;
      try {
        if (process.platform === 'win32') {
          largeFiles = await this.execCommand('forfiles /s /m *.js /c "cmd /c if @fsize GEQ 100000 echo @path @fsize" 2>nul || echo No large files');
        } else {
          largeFiles = await this.execCommand('find . -name "*.js" -o -name "*.ts" -o -name "*.json" | xargs ls -la | awk \'$5 > 100000 {print $9, $5}\' || echo "No large files"');
        }
        
        if (largeFiles && !largeFiles.includes('No large files')) {
          gitIssues.push({
            type: 'Large code files detected (might contain embedded secrets)',
            files: largeFiles.split('\n').filter(f => f.trim()),
            severity: 'LOW'
          });
        }
      } catch (error) {
        // Ignore large file check errors on Windows
      }

      this.results.scans.git = {
        status: gitIssues.length > 0 ? 'WARN' : 'PASS',
        issues: gitIssues
      };

      if (gitIssues.length > 0) {
        console.log(`⚠️  Found ${gitIssues.length} git security issues`);
        this.results.summary.warnings++;
      } else {
        console.log('✅ Git security looks good');
        this.results.summary.passed++;
      }
    } catch (error) {
      console.log('❌ Git scan failed:', error.message);
      this.results.scans.git = {
        status: 'ERROR',
        error: error.message
      };
      this.results.summary.failed++;
    }

    this.results.summary.total++;
  }

  getCodeFiles() {
    const extensions = ['.js', '.ts', '.jsx', '.tsx'];
    const excludeDirs = ['node_modules', 'dist', 'build', '.git', 'coverage'];
    const files = [];

    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !excludeDirs.includes(item)) {
          scanDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    scanDir('.');
    return files;
  }

  async execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  generateReport() {
    const reportPath = 'security-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log('\n📊 Security Scan Summary:');
    console.log(`Total scans: ${this.results.summary.total}`);
    console.log(`Passed: ${this.results.summary.passed}`);
    console.log(`Failed: ${this.results.summary.failed}`);
    console.log(`Warnings: ${this.results.summary.warnings}`);
    console.log(`\nDetailed report saved to: ${reportPath}`);

    // Create human-readable report
    this.generateHumanReport();
  }

  generateHumanReport() {
    const reportPath = 'SECURITY_REPORT.md';
    let report = `# Security Scan Report\n\n`;
    report += `**Generated:** ${this.results.timestamp}\n\n`;
    report += `## Summary\n\n`;
    report += `- **Total Scans:** ${this.results.summary.total}\n`;
    report += `- **Passed:** ✅ ${this.results.summary.passed}\n`;
    report += `- **Failed:** ❌ ${this.results.summary.failed}\n`;
    report += `- **Warnings:** ⚠️ ${this.results.summary.warnings}\n\n`;

    for (const [scanName, scanResult] of Object.entries(this.results.scans)) {
      report += `## ${scanName.charAt(0).toUpperCase() + scanName.slice(1)} Scan\n\n`;
      report += `**Status:** ${scanResult.status}\n\n`;
      
      if (scanResult.issues && scanResult.issues.length > 0) {
        report += `### Issues Found:\n\n`;
        for (const issue of scanResult.issues) {
          report += `- **${issue.type}** (${issue.severity})\n`;
          if (issue.file) report += `  - File: ${issue.file}\n`;
          if (issue.recommendation) report += `  - Recommendation: ${issue.recommendation}\n`;
        }
        report += '\n';
      }
      
      if (scanResult.error) {
        report += `**Error:** ${scanResult.error}\n\n`;
      }
    }

    fs.writeFileSync(reportPath, report);
    console.log(`Human-readable report saved to: ${reportPath}`);
  }
}

// Run if called directly
if (require.main === module) {
  const scanner = new SecurityScanner();
  scanner.runAllScans()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Security scan failed:', error);
      process.exit(1);
    });
}

module.exports = SecurityScanner;