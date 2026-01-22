import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { adminAuthService, AdminRoles, ROLE_PERMISSIONS } from '../modules/admin/admin-auth.service';
import readline from 'readline';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

async function createSuperAdmin() {
  try {
    console.log('🔐 Admin System Setup - Creating Super Admin User\n');

    // Get user input
    const email = await question('Enter super admin email: ');
    const name = await question('Enter super admin name: ');
    const password = await question('Enter super admin password (min 8 chars): ');

    // Validate input
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }

    if (!name || name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { AdminRole: true }
    });

    if (existingUser) {
      if (existingUser.AdminRole.some((role: any) => role.role === AdminRoles.SUPER_ADMIN && role.isActive)) {
        console.log('❌ User already has super admin role');
        return;
      }

      // Add super admin role to existing user
      const success = await adminAuthService.assignAdminRole(
        existingUser.id,
        AdminRoles.SUPER_ADMIN,
        existingUser.id, // Self-assigned for initial setup
        undefined, // No expiration
        ROLE_PERMISSIONS[AdminRoles.SUPER_ADMIN]
      );

      if (success) {
        console.log('✅ Super admin role assigned to existing user');
      } else {
        console.log('❌ Failed to assign super admin role');
      }
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const emailParts = email.split('@');
    const baseUsername = (emailParts[0] || 'admin').toLowerCase();
    const newUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: email.toLowerCase(),
        username: baseUsername,
        name: name.trim(),
        passwordHash,
        isVerified: true, // Super admin is automatically verified
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Assign super admin role
    const success = await adminAuthService.assignAdminRole(
      newUser.id,
      AdminRoles.SUPER_ADMIN,
      newUser.id, // Self-assigned for initial setup
      undefined, // No expiration
      ROLE_PERMISSIONS[AdminRoles.SUPER_ADMIN]
    );

    if (success) {
      console.log('\n✅ Super admin user created successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🔑 Role: ${AdminRoles.SUPER_ADMIN}`);
      console.log(`📊 Permissions: ${ROLE_PERMISSIONS[AdminRoles.SUPER_ADMIN].length} permissions`);
      console.log('\n🚀 You can now log in to the admin panel with these credentials');
    } else {
      console.log('❌ Failed to assign super admin role');
      // Clean up created user
      await prisma.user.delete({ where: { id: newUser.id } });
    }

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

async function listAdmins() {
  try {
    console.log('👥 Current Admin Users:\n');

    const admins = await prisma.user.findMany({
      where: {
        AdminRole: {
          some: { isActive: true }
        }
      },
      include: {
        AdminRole: {
          where: { isActive: true },
          orderBy: { assignedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (admins.length === 0) {
      console.log('No admin users found.');
      return;
    }

    admins.forEach((admin, index) => {
      const roles = admin.AdminRole.map((role: any) => role.role).join(', ');
      console.log(`${index + 1}. ${admin.name || 'Unnamed'} (${admin.email})`);
      console.log(`   Roles: ${roles}`);
      console.log(`   Created: ${admin.createdAt.toISOString()}`);
      console.log(`   Last Login: ${admin.lastLoginAt?.toISOString() || 'Never'}`);
      console.log(`   Active: ${admin.isActive ? '✅' : '❌'}\n`);
    });

  } catch (error) {
    console.error('❌ Error listing admins:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const action = process.argv[2];

  switch (action) {
    case 'create':
      await createSuperAdmin();
      break;
    case 'list':
      await listAdmins();
      break;
    default:
      console.log('🔐 Admin System Management\n');
      console.log('Usage:');
      console.log('  npm run admin:create    - Create a new super admin user');
      console.log('  npm run admin:list      - List all admin users');
      console.log('\nOr run directly:');
      console.log('  npx ts-node src/scripts/admin-setup.ts create');
      console.log('  npx ts-node src/scripts/admin-setup.ts list');
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  await prisma.$disconnect();
  process.exit(0);
});

main().catch(console.error);