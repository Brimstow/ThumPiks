import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

interface TestUser {
  email: string;
  password: string;
  name: string;
  username: string;
}

interface TestAdminUser extends TestUser {
  role: 'super_admin' | 'admin' | 'moderator';
  permissions?: string[];
}

// Admin users configuration
const TEST_ADMIN_USERS: TestAdminUser[] = [
  {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    name: 'Admin User',
    username: 'admin',
    role: 'super_admin',  // Must match AdminRoles enum value
    permissions: [
      'user:read', 'user:write', 'user:delete',
      'system:config', 'system:logs', 'system:health',
      'analytics:read', 'admin:manage'
    ]
  }
];

// Test users configuration
const TEST_USERS: TestUser[] = [
  {
    email: 'testerllm@example.com',
    password: 'LLMdemo2026!',
    name: 'Tester LLM',
    username: 'testerLLM',
  },
  {
    email: 'tester1@example.com',
    password: 'Test123!',
    name: 'Tester One',
    username: 'tester1',
  },
  {
    email: 'tester2@example.com',
    password: 'Test123!',
    name: 'Tester Two',
    username: 'tester2',
  },
  {
    email: 'tester3@example.com',
    password: 'Test123!',
    name: 'Tester Three',
    username: 'tester3',
  },
];

/**
 * Seed test users into the database
 * This function is idempotent - it won't create duplicates
 */
async function seedTestUsers() {
  console.log('🌱 Seeding Test Users...\n');

  const createdUsers = [];
  const existingUsers = [];

  for (const testUser of TEST_USERS) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: testUser.email.toLowerCase() },
        include: { Project: true },
      });

      if (existingUser) {
        existingUsers.push({
          email: testUser.email,
          id: existingUser.id,
          projects: existingUser.Project?.length || 0,
        });
        console.log(`✅ User already exists: ${testUser.email}`);
        console.log(`   - ID: ${existingUser.id}`);
        console.log(`   - Username: ${existingUser.username}`);
        console.log(`   - Projects: ${existingUser.Project?.length || 0}\n`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(testUser.password, 12);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: testUser.email.toLowerCase(),
          name: testUser.name,
          username: testUser.username,
          passwordHash,
          isVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✨ User created: ${testUser.email}`);
      console.log(`   - ID: ${newUser.id}`);
      console.log(`   - Username: ${newUser.username}`);

      // Create default project for the user
      const projectName = `${testUser.name}'s Default Project`;
      const project = await prisma.project.create({
        data: {
          id: crypto.randomUUID(),
          name: projectName,
          description: `Default project for ${testUser.name}`,
          userId: newUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`   - Default project: "${projectName}"`);
      console.log(`   - Project ID: ${project.id}\n`);

      createdUsers.push({
        email: testUser.email,
        id: newUser.id,
        projectId: project.id,
      });
    } catch (error) {
      console.error(`❌ Error processing ${testUser.email}:`, error);
      throw error;
    }
  }

  return { createdUsers, existingUsers };
}

/**
 * Seed admin users into the database
 * Creates users with admin roles and permissions
 */
async function seedAdminUsers() {
  console.log('🔐 Seeding Admin Users...\n');

  const createdAdmins = [];
  const existingAdmins = [];

  for (const adminUser of TEST_ADMIN_USERS) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: adminUser.email.toLowerCase() },
        include: { AdminRole: true },
      });

      let user;
      if (existingUser) {
        user = existingUser;
        existingAdmins.push({
          email: adminUser.email,
          id: existingUser.id,
          roles: existingUser.AdminRole?.map(r => r.role) || [],
        });
        console.log(`✅ Admin user already exists: ${adminUser.email}`);
      } else {
        // Hash password
        const passwordHash = await bcrypt.hash(adminUser.password, 12);

        // Create user
        user = await prisma.user.create({
          data: {
            email: adminUser.email.toLowerCase(),
            name: adminUser.name,
            username: adminUser.username,
            passwordHash,
            isVerified: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          include: { AdminRole: true },
        });

        console.log(`✨ Admin user created: ${adminUser.email}`);
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Username: ${user.username}`);
      }

      // Check if admin role already exists
      const hasAdminRole = user.AdminRole?.some(
        (r: any) => r.role === adminUser.role && r.isActive
      );

      if (!hasAdminRole) {
        // Create admin role
        await prisma.adminRole.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            role: adminUser.role,
            isActive: true,
            assignedBy: user.id,
            assignedAt: new Date(),
            permissions: adminUser.permissions || [],
          },
        });
        console.log(`   - Role assigned: ${adminUser.role}\n`);
      } else {
        console.log(`   - Role already assigned: ${adminUser.role}\n`);
      }

      createdAdmins.push({
        email: adminUser.email,
        id: user.id,
        role: adminUser.role,
      });
    } catch (error) {
      console.error(`❌ Error processing admin ${adminUser.email}:`, error);
      throw error;
    }
  }

  return { createdAdmins, existingAdmins };
}

/**
 * Main seed function
 */
async function main() {
  try {
    // Only seed test users in development/test environments
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // Allow seeding in staging/demo environments without override
    const isStagingLike = ['staging', 'demo', 'qa', 'test'].includes(nodeEnv);
    
    if (nodeEnv === 'production' && !isStagingLike) {
      console.log('⚠️  Skipping test user seeding in production environment');
      console.log('   Set SEED_TEST_USERS=true to force seeding (e.g., for testing AI features)');
      console.log('   Or use NODE_ENV=staging for test/demo environments\n');
      
      if (process.env.SEED_TEST_USERS !== 'true') {
        return;
      }
      
      console.log('⚠️  SEED_TEST_USERS=true detected, proceeding with seeding...');
      console.log('💡 Tip: For testing environments, use NODE_ENV=staging instead\n');
    }
    
    if (isStagingLike) {
      console.log(`✅ ${nodeEnv.toUpperCase()} environment detected - test users will be seeded\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 DATABASE SEEDING STARTED');
    console.log(`📍 Environment: ${nodeEnv}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { createdUsers, existingUsers } = await seedTestUsers();

    // Seed admin users
    const { createdAdmins, existingAdmins } = await seedAdminUsers();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE SEEDING COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Summary:');
    console.log(`   - New users created: ${createdUsers.length}`);
    console.log(`   - Existing users found: ${existingUsers.length}`);
    console.log(`   - Total test users: ${TEST_USERS.length}`);
    console.log(`   - New admins created: ${createdAdmins.length}`);
    console.log(`   - Existing admins found: ${existingAdmins.length}`);
    console.log(`   - Total admin users: ${TEST_ADMIN_USERS.length}\n`);

    if (createdUsers.length > 0) {
      console.log('🆕 Newly Created Users:');
      createdUsers.forEach((user) => {
        console.log(`   - ${user.email} (ID: ${user.id})`);
      });
      console.log('');
    }

    if (existingUsers.length > 0) {
      console.log('📋 Existing Users:');
      existingUsers.forEach((user) => {
        console.log(`   - ${user.email} (${user.projects} projects)`);
      });
      console.log('');
    }

    console.log('\n� Admin Credentials Summary:');
    console.log('═══════════════════════════════════════════════');
    TEST_ADMIN_USERS.forEach((admin) => {
      console.log(`\n${admin.name} (${admin.role}):`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Username: ${admin.username}`);
      console.log(`  Password: ${admin.password}`);
    });

    console.log('\n\n�� Test Credentials Summary:');
    console.log('═══════════════════════════════════════════════');
    TEST_USERS.forEach((user) => {
      console.log(`\n${user.name}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Password: ${user.password}`);
    });
    console.log('\n═══════════════════════════════════════════════');
    console.log('\n🚀 Ready for Testing!');
    console.log('📍 Frontend: http://localhost:8556');
    console.log('📍 Backend API: http://localhost:8550');
    console.log('📍 Admin Portal: http://localhost:8556/admin/login\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
main()
  .then(() => {
    console.log('👋 Seed script completed successfully');
  })
  .catch((error) => {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  });
