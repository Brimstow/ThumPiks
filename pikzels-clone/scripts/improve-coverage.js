#!/usr/bin/env node

/**
 * Test Coverage Improvement Script
 * Analyzes current coverage and suggests improvements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageAnalyzer {
  constructor() {
    this.coverageThreshold = {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    };
  }

  /**
   * Analyze current test coverage and provide recommendations
   */
  async analyzeCoverage() {
    console.log('🔍 Analyzing test coverage...\n');
    
    try {
      // Run coverage and capture output
      const coverageOutput = execSync('npm run test:coverage -- --silent', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const coverageData = this.parseCoverageOutput(coverageOutput);
      this.generateRecommendations(coverageData);
      
    } catch (error) {
      console.error('❌ Error running coverage analysis:', error.message);
      this.analyzeFailedTests();
    }
  }

  /**
   * Parse coverage output to extract metrics
   */
  parseCoverageOutput(output) {
    const lines = output.split('\n');
    const coverageData = {
      overall: {},
      files: []
    };

    // Look for the "All files" line with overall coverage
    const overallLine = lines.find(line => line.includes('All files'));
    if (overallLine) {
      const parts = overallLine.split('|').map(p => p.trim());
      if (parts.length >= 5) {
        coverageData.overall = {
          statements: parseFloat(parts[1]) || 0,
          branches: parseFloat(parts[2]) || 0,
          functions: parseFloat(parts[3]) || 0,
          lines: parseFloat(parts[4]) || 0
        };
      }
    }

    return coverageData;
  }

  /**
   * Generate improvement recommendations based on coverage data
   */
  generateRecommendations(coverageData) {
    console.log('📊 CURRENT COVERAGE ANALYSIS\n');
    console.log('='.repeat(50));
    
    const { overall } = coverageData;
    const recommendations = [];

    // Check each metric against threshold
    Object.entries(this.coverageThreshold).forEach(([metric, threshold]) => {
      const current = overall[metric] || 0;
      const status = current >= threshold ? '✅' : '❌';
      const gap = threshold - current;
      
      console.log(`${status} ${metric.toUpperCase()}: ${current.toFixed(1)}% (Target: ${threshold}%)`);
      
      if (gap > 0) {
        recommendations.push({
          metric,
          current,
          target: threshold,
          gap: gap.toFixed(1),
          priority: gap > 20 ? 'HIGH' : gap > 10 ? 'MEDIUM' : 'LOW'
        });
      }
    });

    console.log('\n' + '='.repeat(50));
    console.log('🎯 IMPROVEMENT RECOMMENDATIONS\n');

    if (recommendations.length === 0) {
      console.log('🎉 Excellent! All coverage targets are met!');
      return;
    }

    // Sort by priority and gap size
    recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority] || b.gap - a.gap;
    });

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.priority} PRIORITY - Improve ${rec.metric}`);
      console.log(`   Current: ${rec.current.toFixed(1)}% → Target: ${rec.target}% (Gap: ${rec.gap}%)`);
      console.log(`   ${this.getSpecificRecommendation(rec.metric)}\n`);
    });

    this.suggestNextSteps();
  }

  /**
   * Get specific recommendations for each coverage metric
   */
  getSpecificRecommendation(metric) {
    const recommendations = {
      statements: '• Add tests for uncovered code paths\n   • Focus on error handling and edge cases\n   • Test all conditional branches',
      branches: '• Test both true/false conditions\n   • Add tests for all switch/case scenarios\n   • Cover error and success paths',
      functions: '• Write tests for all public functions\n   • Test private methods indirectly\n   • Focus on utility and service functions',
      lines: '• Ensure every line of code is executed in tests\n   • Remove dead/unreachable code\n   • Add integration tests for complex flows'
    };

    return recommendations[metric] || '• Add comprehensive test coverage';
  }

  /**
   * Analyze failed tests and provide guidance
   */
  analyzeFailedTests() {
    console.log('🔧 ANALYZING FAILED TESTS\n');
    console.log('='.repeat(50));
    
    const commonIssues = [
      {
        pattern: 'mockPrisma',
        solution: 'Fix mock initialization order - mock before importing services'
      },
      {
        pattern: 'Expected.*Received',
        solution: 'Update test expectations to match actual implementation behavior'
      },
      {
        pattern: 'timeout',
        solution: 'Increase test timeout or optimize async operations'
      },
      {
        pattern: 'Cannot access.*before initialization',
        solution: 'Reorder imports - mock dependencies before importing modules'
      }
    ];

    console.log('Common test failure patterns and solutions:\n');
    commonIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.pattern}`);
      console.log(`   💡 Solution: ${issue.solution}\n`);
    });
  }

  /**
   * Suggest next steps for improvement
   */
  suggestNextSteps() {
    console.log('🚀 NEXT STEPS TO IMPROVE COVERAGE\n');
    console.log('='.repeat(50));
    
    const steps = [
      '1. Fix failing tests first (they block coverage measurement)',
      '2. Focus on HIGH priority metrics with largest gaps',
      '3. Add tests for security-critical functions (auth, validation)',
      '4. Write integration tests for API endpoints',
      '5. Add error case testing for all service functions',
      '6. Test edge cases and boundary conditions',
      '7. Run coverage after each improvement to track progress'
    ];

    steps.forEach(step => console.log(step));
    
    console.log('\n💡 TIP: Use "npm run test:watch" for continuous testing during development');
    console.log('💡 TIP: Run specific test files: "npx jest path/to/test.ts"');
  }
}

// Run the analyzer
const analyzer = new CoverageAnalyzer();
analyzer.analyzeCoverage().catch(console.error);