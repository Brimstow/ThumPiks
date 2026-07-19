import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * PRODUCTION CLEANUP SCRIPT
 * Removes test users from the database
 * 
 * ⚠️ WARNING: This is irreversible!
 * Only run this in production if test users were accidentally seeded
 */

const TEST_USER_EMAILS = [
  'tester1@example.com',
  'tester2@example.com',
  'tester3@example.com',
];

async function removeTestUsers() {
  console.log('🗑️  Test User Removal Script\n');
  console.log('⚠️  WARNING: This will permanently delete test users and their data!');
  
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`📍 Environment: ${nodeEnv}\n`);

  // Safety check for development
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    console.log('❌ This script is for PRODUCTION cleanup only.');
    console.log('💡 In development/test, you can reset the database with:');
    console.log('   npm run db:reset\n');
    process.exit(1);
  }

  // Require explicit confirmation
  if (process.env.CONFIRM_REMOVE_TEST_USERS !== 'yes') {
    console.log('❌ Confirmation required.');
    console.log('💡 To confirm removal, run:');
    console.log('   CONFIRM_REMOVE_TEST_USERS=yes npm run test:users:remove\n');
    process.exit(1);
  }

  console.log('🔍 Searching for test users...\n');

  let totalRemoved = 0;

  for (const email of TEST_USER_EMAILS) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          Project: true,
          Thumbnail: true,
          Template: true,
        },
      });

      if (user) {
        console.log(`📧 Found: ${email}`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Projects: ${user.Project?.length || 0}`);
        console.log(`   - Thumbnails: ${user.Thumbnail?.length || 0}`);
        console.log(`   - Templates: ${user.Template?.length || 0}`);

        // Delete user (cascades to related records)
        await prisma.user.delete({
          where: { id: user.id },
        });

        console.log(`   ✅ Deleted\n`);
        totalRemoved++;
      } else {
        console.log(`📧 ${email} - Not found (already removed)\n`);
      }
    } catch (error) {
      console.error(`❌ Error removing ${email}:`, error);
    }
  }

  console.log('═'.repeat(60));
  console.log(`\n📊 Summary: ${totalRemoved} test user(s) removed\n`);

  if (totalRemoved > 0) {
    console.log('✅ Production database cleaned successfully.');
    console.log('🔒 Test users have been removed from production.\n');
  } else {
    console.log('✅ No test users found. Database is clean.\n');
  }

  await prisma.$disconnect();
}

removeTestUsers()
  .then(() => {
    console.log('👋 Cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
