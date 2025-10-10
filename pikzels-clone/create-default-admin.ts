import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { adminAuthService, AdminRoles, ROLE_PERMISSIONS } from './src/modules/admin/admin-auth.service';

const prisma = new PrismaClient();

async function createDefaultSuperAdmin() {
  try {
    console.log('🔐 Creating Default Super Admin User...\n');

    // Default credentials for easy setup
    const email = 'admin@example.com';
    const name = 'System Administrator';
    const password = 'AdminPass123!';

    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔑 Password: ${password}\n`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { adminRoles: true }
    });

    if (existingUser) {
      if (existingUser.adminRoles.some(role => role.role === AdminRoles.SUPER_ADMIN && role.isActive)) {
        console.log('❌ Super admin user already exists!');
        console.log('✅ You can login with the credentials above');
        return;
      }

      // Add super admin role to existing user
      const success = await adminAuthService.assignAdminRole(
        existingUser.id,
        AdminRoles.SUPER_ADMIN,
        existingUser.id,
        undefined,
        ROLE_PERMISSIONS[AdminRoles.SUPER_ADMIN]
      );

      if (success) {
        console.log('✅ Super admin role assigned to existing user');
        console.log('🚀 You can now log in to the admin panel');
      } else {
        console.log('❌ Failed to assign super admin role');
      }
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        passwordHash,
        isVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Assign super admin role
    const success = await adminAuthService.assignAdminRole(
      newUser.id,
      AdminRoles.SUPER_ADMIN,
      newUser.id,
      undefined,
      ROLE_PERMISSIONS[AdminRoles.SUPER_ADMIN]
    );

    if (success) {
      console.log('\n✅ Super admin user created successfully!');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${name}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`🔐 Role: ${AdminRoles.SUPER_ADMIN}`);
      console.log(`📊 Permissions: ${ROLE_PERMISSIONS[AdminRoles.SUPER_ADMIN].length} permissions`);
      console.log('\n🚀 You can now log in to the admin panel with these credentials');
      console.log('\n💡 Remember to change the password in production!');
    } else {
      console.log('❌ Failed to assign super admin role');
      await prisma.user.delete({ where: { id: newUser.id } });
    }

  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDefaultSuperAdmin().catch(console.error);