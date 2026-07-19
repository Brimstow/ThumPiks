import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface TestUser {
  email: string;
  password: string;
  name: string;
}

const testUsers: TestUser[] = [
  {
    email: 'tester1@example.com',
    password: 'Test123!',
    name: 'Tester One',
  },
  {
    email: 'tester2@example.com',
    password: 'Test123!',
    name: 'Tester Two',
  },
  {
    email: 'tester3@example.com',
    password: 'Test123!',
    name: 'Tester Three',
  },
];

async function createTestUsers() {
  try {
    console.log('🔐 Creating Test Users...\n');

    for (const testUser of testUsers) {
      console.log(`\n📧 Processing: ${testUser.email}`);

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: testUser.email.toLowerCase() },
        include: { Project: true },
      });

      if (existingUser) {
        console.log(`✅ User already exists: ${testUser.email}`);
        console.log(`   - ID: ${existingUser.id}`);
        console.log(`   - Name: ${existingUser.name}`);
        console.log(`   - Projects: ${existingUser.Project?.length || 0}`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(testUser.password, 12);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: testUser.email.toLowerCase(),
          name: testUser.name,
          username: testUser.email.split('@')[0] || 'user', // Use email prefix as username
          passwordHash,
          isVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✅ User created: ${testUser.email}`);
      console.log(`   - ID: ${newUser.id}`);
      console.log(`   - Name: ${newUser.name}`);

      // Create default project for the user
      const projectName = `${testUser.name} Default Project`;
      const project = await prisma.project.create({
        data: {
          id: crypto.randomUUID(), // Add required ID field
          name: projectName,
          description: `Default project for ${testUser.name}`,
          userId: newUser.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Default project created: "${projectName}"`);
      console.log(`   - Project ID: ${project.id}`);
    }

    console.log('\n\n🎉 All test users created successfully!');
    console.log('\n📋 Test Credentials Summary:');
    console.log('═══════════════════════════════════════════════');

    for (const testUser of testUsers) {
      console.log(`\n${testUser.name}:`);
      console.log(`  Email: ${testUser.email}`);
      console.log(`  Password: ${testUser.password}`);
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('\n🚀 You can now log in with these credentials!');
    console.log('📍 Login URL: http://localhost:8556/login');
    console.log('📍 Landing Page: http://localhost:8556');
    console.log('\n💡 Use these credentials in the sign-in modal on the landing page');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers().catch(console.error);
