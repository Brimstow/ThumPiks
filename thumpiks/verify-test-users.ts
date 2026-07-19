import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Verification script for test user implementation
 * Checks if test users and their projects exist in the database
 */
async function verifyTestUsers(): Promise<void> {
  console.log('🔍 Verifying Test User Implementation...\n');
  console.log('═'.repeat(60));

  const results: TestResult[] = [];
  
  // Expected test users
  const expectedUsers = [
    { email: 'tester1@example.com', username: 'tester1', name: 'Tester One' },
    { email: 'tester2@example.com', username: 'tester2', name: 'Tester Two' },
    { email: 'tester3@example.com', username: 'tester3', name: 'Tester Three' },
  ];

  // Test 1: Database connection
  console.log('\n📌 Test 1: Database Connection');
  try {
    await prisma.$connect();
    results.push({
      success: true,
      message: 'Database connection successful',
    });
    console.log('✅ Database connection successful');
  } catch (error) {
    results.push({
      success: false,
      message: 'Database connection failed',
      details: error,
    });
    console.log('❌ Database connection failed:', error);
    return;
  }

  // Test 2: Check test users exist
  console.log('\n📌 Test 2: Test Users Existence');
  for (const expectedUser of expectedUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: expectedUser.email },
        include: { Project: true },
      });

      if (user) {
        results.push({
          success: true,
          message: `User found: ${expectedUser.email}`,
          details: {
            id: user.id,
            username: user.username,
            name: user.name,
            projects: user.Project?.length || 0,
          },
        });
        console.log(`✅ ${expectedUser.email}`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Name: ${user.name}`);
        console.log(`   - Projects: ${user.Project?.length || 0}`);
        console.log(`   - Verified: ${user.isVerified ? 'Yes' : 'No'}`);
        console.log(`   - Active: ${user.isActive ? 'Yes' : 'No'}`);
      } else {
        results.push({
          success: false,
          message: `User not found: ${expectedUser.email}`,
        });
        console.log(`❌ ${expectedUser.email} - NOT FOUND`);
      }
    } catch (error) {
      results.push({
        success: false,
        message: `Error checking user: ${expectedUser.email}`,
        details: error,
      });
      console.log(`❌ Error checking ${expectedUser.email}:`, error);
    }
  }

  // Test 3: Check username uniqueness
  console.log('\n📌 Test 3: Username Uniqueness');
  for (const expectedUser of expectedUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { username: expectedUser.username },
      });

      if (user && user.email === expectedUser.email) {
        results.push({
          success: true,
          message: `Username mapping correct: ${expectedUser.username}`,
        });
        console.log(`✅ ${expectedUser.username} → ${expectedUser.email}`);
      } else if (user) {
        results.push({
          success: false,
          message: `Username collision: ${expectedUser.username}`,
          details: { foundEmail: user.email, expectedEmail: expectedUser.email },
        });
        console.log(`❌ Username ${expectedUser.username} maps to wrong email`);
      } else {
        results.push({
          success: false,
          message: `Username not found: ${expectedUser.username}`,
        });
        console.log(`❌ Username ${expectedUser.username} not found`);
      }
    } catch (error) {
      console.log(`❌ Error checking username ${expectedUser.username}:`, error);
    }
  }

  // Test 4: Check default projects
  console.log('\n📌 Test 4: Default Projects');
  for (const expectedUser of expectedUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: expectedUser.email },
        include: { Project: true },
      });

      if (user && user.Project && user.Project.length > 0) {
        const defaultProject = user.Project.find((p) =>
          p.name.includes('Default Project')
        );

        if (defaultProject) {
          results.push({
            success: true,
            message: `Default project exists for ${expectedUser.email}`,
            details: {
              projectId: defaultProject.id,
              projectName: defaultProject.name,
            },
          });
          console.log(`✅ ${expectedUser.name} has default project`);
          console.log(`   - Project: "${defaultProject.name}"`);
          console.log(`   - ID: ${defaultProject.id}`);
        } else {
          results.push({
            success: false,
            message: `Default project not found for ${expectedUser.email}`,
            details: { existingProjects: user.Project.map((p) => p.name) },
          });
          console.log(`⚠️  ${expectedUser.name} has projects but no default project`);
        }
      } else {
        results.push({
          success: false,
          message: `No projects found for ${expectedUser.email}`,
        });
        console.log(`❌ ${expectedUser.name} has no projects`);
      }
    } catch (error) {
      console.log(`❌ Error checking projects for ${expectedUser.email}:`, error);
    }
  }

  // Test 5: Password hash verification
  console.log('\n📌 Test 5: Password Hash Verification');
  for (const expectedUser of expectedUsers) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: expectedUser.email },
        select: { passwordHash: true, email: true },
      });

      if (user && user.passwordHash) {
        results.push({
          success: true,
          message: `Password hash exists for ${expectedUser.email}`,
        });
        console.log(`✅ ${expectedUser.email} has password hash`);
      } else {
        results.push({
          success: false,
          message: `Password hash missing for ${expectedUser.email}`,
        });
        console.log(`❌ ${expectedUser.email} missing password hash`);
      }
    } catch (error) {
      console.log(`❌ Error checking password for ${expectedUser.email}:`, error);
    }
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Verification Summary\n');

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${successRate}%`);

  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Test user implementation is working correctly.');
    console.log('\n📍 You can now:');
    console.log('   1. Login at http://localhost:8556 with any test credentials');
    console.log('   2. Run E2E tests: npm run test:e2e');
    console.log('   3. Access Prisma Studio: npm run prisma:studio');
  } else {
    console.log('\n⚠️  Some tests failed. Please run: npm run prisma:seed');
    console.log('   Then run this verification script again.');
  }

  console.log('\n💡 Quick Reference:');
  console.log('   - Credentials: See TEST_CREDENTIALS.md');
  console.log('   - Setup Guide: See TEST_USER_SETUP_GUIDE.md');
  console.log('   - Quick Start: npm run prisma:seed\n');

  await prisma.$disconnect();
}

// Run verification
verifyTestUsers()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification script error:', error);
    process.exit(1);
  });
