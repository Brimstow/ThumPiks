const { execSync } = require('child_process');

console.log('🔍 TypeScript Error Analysis');
console.log('================================');

try {
  // Run TypeScript compiler and capture output
  const result = execSync('npx tsc --noEmit', { 
    encoding: 'utf8',
    cwd: process.cwd(),
    timeout: 30000
  });
  
  console.log('✅ No TypeScript errors found!');
  
} catch (error) {
  const output = error.stdout || error.message;
  
  // Parse and categorize errors
  const lines = output.split('\n');
  const errors = lines.filter(line => line.includes(' - error '));
  
  console.log(`📊 Total Errors Found: ${errors.length}`);
  
  // Categorize errors
  const categories = {
    'Route Parameters': 0,
    'Unused Variables': 0,
    'Optional Properties': 0,
    'Type Assertions': 0,
    'Other': 0
  };
  
  errors.forEach(error => {
    if (error.includes('string | undefined') && error.includes('string')) {
      categories['Route Parameters']++;
    } else if (error.includes('never read') || error.includes('declared but')) {
      categories['Unused Variables']++;
    } else if (error.includes('exactOptionalPropertyTypes')) {
      categories['Optional Properties']++;
    } else if (error.includes('overload') || error.includes('SignOptions')) {
      categories['Type Assertions']++;
    } else {
      categories['Other']++;
    }
  });
  
  console.log('\n📈 Error Categories:');
  Object.entries(categories).forEach(([category, count]) => {
    if (count > 0) {
      console.log(`   ${category}: ${count}`);
    }
  });
  
  console.log('\n🎯 Most Common Errors (First 10):');
  errors.slice(0, 10).forEach((error, i) => {
    console.log(`   ${i+1}. ${error.split(':').slice(3).join(':').trim()}`);
  });
}