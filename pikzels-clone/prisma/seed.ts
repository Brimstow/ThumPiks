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
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern -- intentional test credential
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
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern -- intentional test credential
    password: 'LLMdemo2026!',
    name: 'Tester LLM',
    username: 'testerLLM',
  },
  {
    email: 'tester1@example.com',
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern -- intentional test credential
    password: 'Test123!',
    name: 'Tester One',
    username: 'tester1',
  },
  {
    email: 'tester2@example.com',
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern -- intentional test credential
    password: 'Test123!',
    name: 'Tester Two',
    username: 'tester2',
  },
  {
    email: 'tester3@example.com',
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern -- intentional test credential
    password: 'Test123!',
    name: 'Tester Three',
    username: 'tester3',
  },
  {
    email: 'ultratester@thumpiks.com',
    // secretlint-disable-next-line @secretlint/secretlint-rule-pattern -- intentional test credential
    password: 'UltraTest2026!',
    name: 'Ultra Tester',
    username: 'ultratester',
  },
];

// Subscription plans for test accounts (varied tiers for testing)
// 999999 credits = effectively unlimited for staging/QA
// All tester accounts get ultra_pro + unlimited credits so every tier is accessible
const TEST_SUBSCRIPTIONS: Record<string, { planType: string; credits: number }> = {
  'ultratester@thumpiks.com': { planType: 'ultra_pro', credits: 999999 },
  'testerllm@example.com':    { planType: 'ultra_pro', credits: 999999 },
  'admin@example.com':        { planType: 'ultra_pro', credits: 999999 },
  'tester1@example.com':      { planType: 'ultra_pro', credits: 999999 },
  'tester2@example.com':      { planType: 'ultra_pro', credits: 999999 },
  'tester3@example.com':      { planType: 'ultra_pro', credits: 999999 },
};

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
 * Seed subscriptions for test users
 * Gives each test account a plan so AI Tools and other gated features work
 */
async function seedSubscriptions() {
  console.log('💳 Seeding Test Subscriptions...\n');

  let created = 0;
  let existing = 0;

  for (const [email, plan] of Object.entries(TEST_SUBSCRIPTIONS)) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        console.log(`   ⏭️  Skipping ${email} (user not found)`);
        continue;
      }

      // Check if subscription already exists
      const existingSub = await prisma.subscription.findFirst({
        where: { userId: user.id },
      });

      if (existingSub) {
        // Update existing subscription to match seed config
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: {
            planType: plan.planType,
            creditsBalance: plan.credits,
            creditsUsed: 0,
          },
        });
        existing++;
        console.log(`   ♻️  ${email} updated → ${plan.planType} (${plan.credits} credits)`);
        continue;
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 year from now

      await prisma.subscription.create({
        data: {
          id: `seed_sub_${user.id.slice(0, 8)}_${Date.now()}`,
          userId: user.id,
          planType: plan.planType,
          creditsBalance: plan.credits,
          creditsUsed: 0,
          periodStart: now,
          periodEnd,
          billingCycle: 'monthly',
          status: 'active',
          cancelAtPeriodEnd: false,
        },
      });

      created++;
      console.log(`   ✨ ${email} → ${plan.planType} (${plan.credits} credits)`);
    } catch (error) {
      console.error(`   ❌ Error seeding subscription for ${email}:`, error);
    }
  }

  console.log(`\n   📊 Subscriptions: ${created} created, ${existing} already existed\n`);
  return { created, existing };
}

// ============================================
// Composition Layout Presets (moved from hardcoded presets.ts)
// ============================================

function svgRect(x: number, y: number, w: number, h: number, fill = '#555', label?: string): string {
  const lx = Math.round((x + w / 2) * 200);
  const ly = Math.round((y + h / 2) * 112);
  const labelSvg = label
    ? `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9" font-family="sans-serif">${label}</text>`
    : '';
  return `<rect x="${Math.round(x * 200)}" y="${Math.round(y * 112)}" width="${Math.round(w * 200)}" height="${Math.round(h * 112)}" rx="3" fill="${fill}" opacity="0.7"/>${labelSvg}`;
}

function wireframe(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 112" fill="none">`
    + `<rect width="200" height="112" rx="6" fill="#1a1a2e"/>`
    + inner
    + `</svg>`;
}

const BUILTIN_LAYOUTS = [
  {
    id: 'split-screen-vertical',
    name: 'Split Screen',
    description: 'Two images side by side with text in the center',
    category: 'split-screen',
    tags: ['split', 'versus', 'comparison', 'two-person'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 0.5, 1, '#e74c3c', 'Left')
      + svgRect(0.5, 0, 0.5, 1, '#3498db', 'Right')
      + svgRect(0.3, 0.35, 0.4, 0.3, '#222', 'TEXT')
    ),
    slots: [
      { id: 'left', label: 'Left Image', role: 'primary', bounds: { x: 0, y: 0, width: 0.5, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, required: true },
      { id: 'right', label: 'Right Image', role: 'secondary', bounds: { x: 0.5, y: 0, width: 0.5, height: 1 }, fit: 'cover', zIndex: 1, mask: 'none', blendMode: 'normal', opacity: 100, required: true },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.15, y: 0.35, width: 0.7, height: 0.3 }, zIndex: 10, defaultStyle: { fontFamily: 'Impact', fontSize: 96, fontWeight: 800, color: '#ffffff', stroke: '#000000', strokeWidth: 4, textAlign: 'center', textTransform: 'uppercase' }, placeholder: 'VS' },
    ],
    fallbackBackground: '#000000',
    popularity: 95,
  },
  {
    id: 'split-screen-diagonal',
    name: 'Diagonal Split',
    description: 'Two images separated by a dramatic diagonal cut',
    category: 'split-screen',
    tags: ['split', 'diagonal', 'dynamic', 'versus'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      `<polygon points="0,0 130,0 70,112 0,112" fill="#e74c3c" opacity="0.7"/>`
      + `<text x="45" y="56" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9" font-family="sans-serif">Left</text>`
      + `<polygon points="130,0 200,0 200,112 70,112" fill="#3498db" opacity="0.7"/>`
      + `<text x="155" y="56" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9" font-family="sans-serif">Right</text>`
      + svgRect(0.25, 0.7, 0.5, 0.2, '#222', 'TEXT')
    ),
    slots: [
      { id: 'left', label: 'Left Image', role: 'primary', bounds: { x: 0, y: 0, width: 0.65, height: 1 }, fit: 'cover', zIndex: 0, mask: 'diagonal-left', blendMode: 'normal', opacity: 100, required: true },
      { id: 'right', label: 'Right Image', role: 'secondary', bounds: { x: 0.35, y: 0, width: 0.65, height: 1 }, fit: 'cover', zIndex: 1, mask: 'diagonal-right', blendMode: 'normal', opacity: 100, required: true },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.15, y: 0.7, width: 0.7, height: 0.2 }, zIndex: 10, defaultStyle: { fontFamily: 'Impact', fontSize: 72, fontWeight: 800, color: '#ffffff', stroke: '#000000', strokeWidth: 3, textAlign: 'center', textTransform: 'uppercase' }, placeholder: 'YOUR TITLE' },
    ],
    fallbackBackground: '#000000',
    popularity: 88,
  },
  {
    id: 'person-over-bg',
    name: 'Person + Background',
    description: 'Subject in front with a dramatic background behind',
    category: 'person-bg',
    tags: ['person', 'background', 'portrait', 'subject', 'foreground'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 1, 1, '#2c3e50', 'Background')
      + svgRect(0.25, 0.1, 0.5, 0.9, '#e67e22', 'Person')
      + svgRect(0.1, 0.05, 0.8, 0.2, '#222', 'TEXT')
    ),
    slots: [
      { id: 'background', label: 'Background', role: 'background', bounds: { x: 0, y: 0, width: 1, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, filter: 'brightness(0.7)', required: false },
      { id: 'person', label: 'Person / Subject', role: 'primary', bounds: { x: 0.2, y: 0.05, width: 0.6, height: 0.95 }, fit: 'contain', zIndex: 5, mask: 'none', blendMode: 'normal', opacity: 100, autoRemoveBg: true, required: true },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.05, y: 0.02, width: 0.9, height: 0.2 }, zIndex: 10, defaultStyle: { fontFamily: 'Inter', fontSize: 80, fontWeight: 800, color: '#ffffff', stroke: '#000000', strokeWidth: 3, textAlign: 'center' }, placeholder: 'YOUR TITLE HERE' },
      { id: 'subtitle', label: 'Subtitle', role: 'text', bounds: { x: 0.1, y: 0.82, width: 0.8, height: 0.12 }, zIndex: 10, defaultStyle: { fontFamily: 'Inter', fontSize: 36, fontWeight: 600, color: '#f1c40f', textAlign: 'center' }, placeholder: 'Subtitle goes here' },
    ],
    fallbackBackground: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    popularity: 92,
  },
  {
    id: 'triple-panel',
    name: 'Triple Panel',
    description: 'Three images in equal vertical panels with title overlay',
    category: 'collage',
    tags: ['collage', 'three', 'panel', 'triple', 'grid'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 0.333, 1, '#e74c3c', '1')
      + svgRect(0.333, 0, 0.334, 1, '#2ecc71', '2')
      + svgRect(0.667, 0, 0.333, 1, '#3498db', '3')
      + svgRect(0.1, 0.75, 0.8, 0.2, '#222', 'TEXT')
    ),
    slots: [
      { id: 'panel-1', label: 'Panel 1', role: 'primary', bounds: { x: 0, y: 0, width: 0.333, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, required: true },
      { id: 'panel-2', label: 'Panel 2', role: 'secondary', bounds: { x: 0.333, y: 0, width: 0.334, height: 1 }, fit: 'cover', zIndex: 1, mask: 'none', blendMode: 'normal', opacity: 100, required: true },
      { id: 'panel-3', label: 'Panel 3', role: 'accent', bounds: { x: 0.667, y: 0, width: 0.333, height: 1 }, fit: 'cover', zIndex: 2, mask: 'none', blendMode: 'normal', opacity: 100, required: false },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.05, y: 0.75, width: 0.9, height: 0.2 }, zIndex: 10, defaultStyle: { fontFamily: 'Impact', fontSize: 80, fontWeight: 800, color: '#ffffff', stroke: '#000000', strokeWidth: 3, textAlign: 'center', textTransform: 'uppercase' }, placeholder: 'YOUR TITLE' },
    ],
    fallbackBackground: '#000000',
    popularity: 78,
  },
  {
    id: 'reaction',
    name: 'Reaction',
    description: 'Large content image with a small reaction face in the corner',
    category: 'reaction',
    tags: ['reaction', 'face', 'corner', 'commentary', 'response'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 1, 1, '#34495e', 'Content')
      + svgRect(0.65, 0.55, 0.32, 0.42, '#e74c3c', 'Face')
      + svgRect(0.05, 0.05, 0.6, 0.2, '#222', 'TEXT')
    ),
    slots: [
      { id: 'content', label: 'Content Image', role: 'background', bounds: { x: 0, y: 0, width: 1, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, required: true },
      { id: 'face', label: 'Reaction Face', role: 'primary', bounds: { x: 0.65, y: 0.55, width: 0.33, height: 0.43 }, fit: 'cover', zIndex: 5, mask: 'none', blendMode: 'normal', opacity: 100, autoRemoveBg: true, required: false },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.03, y: 0.03, width: 0.6, height: 0.25 }, zIndex: 10, defaultStyle: { fontFamily: 'Inter', fontSize: 72, fontWeight: 800, color: '#ffffff', stroke: '#000000', strokeWidth: 3, textAlign: 'left', textTransform: 'uppercase' }, placeholder: 'REACTION!' },
    ],
    fallbackBackground: '#1a1a2e',
    popularity: 85,
  },
  {
    id: 'cinematic-wide',
    name: 'Cinematic',
    description: 'Full-bleed hero image with letterbox bars and title',
    category: 'cinematic',
    tags: ['cinematic', 'movie', 'film', 'hero', 'dramatic', 'widescreen'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 1, 1, '#2c3e50', 'Hero Image')
      + `<rect x="0" y="0" width="200" height="16" fill="#000" opacity="0.8"/>`
      + `<rect x="0" y="96" width="200" height="16" fill="#000" opacity="0.8"/>`
      + svgRect(0.1, 0.35, 0.8, 0.3, '#222', 'TEXT')
    ),
    slots: [
      { id: 'hero', label: 'Hero Image', role: 'primary', bounds: { x: 0, y: 0, width: 1, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, filter: 'contrast(1.1) saturate(1.2)', required: true },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.05, y: 0.35, width: 0.9, height: 0.3 }, zIndex: 10, defaultStyle: { fontFamily: 'Georgia', fontSize: 88, fontWeight: 700, color: '#ffffff', stroke: '#000000', strokeWidth: 2, textAlign: 'center', textTransform: 'uppercase' }, placeholder: 'MOVIE TITLE' },
    ],
    fallbackBackground: '#000000',
    popularity: 75,
  },
  {
    id: 'blended-double',
    name: 'Blended Overlay',
    description: 'Two images blended together with a soft overlay effect',
    category: 'person-bg',
    tags: ['blend', 'overlay', 'double-exposure', 'artistic', 'fade'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 1, 1, '#8e44ad', 'Base')
      + svgRect(0, 0, 1, 1, '#e74c3c', 'Overlay')
      + svgRect(0.15, 0.7, 0.7, 0.2, '#222', 'TEXT')
    ),
    slots: [
      { id: 'base', label: 'Base Image', role: 'background', bounds: { x: 0, y: 0, width: 1, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, required: true },
      { id: 'overlay', label: 'Overlay Image', role: 'primary', bounds: { x: 0, y: 0, width: 1, height: 1 }, fit: 'cover', zIndex: 1, mask: 'none', blendMode: 'screen', opacity: 60, required: true },
    ],
    textSlots: [
      { id: 'title', label: 'Title', role: 'text', bounds: { x: 0.1, y: 0.7, width: 0.8, height: 0.2 }, zIndex: 10, defaultStyle: { fontFamily: 'Inter', fontSize: 72, fontWeight: 800, color: '#ffffff', textAlign: 'center' }, placeholder: 'BLENDED' },
    ],
    fallbackBackground: '#1a1a2e',
    popularity: 70,
  },
  {
    id: 'minimal-text-focus',
    name: 'Minimal + Text',
    description: 'Clean single image with large bold text overlay for maximum readability',
    category: 'minimal',
    tags: ['minimal', 'clean', 'text', 'simple', 'bold'],
    canvasWidth: 1920,
    canvasHeight: 1080,
    wireframeSvg: wireframe(
      svgRect(0, 0, 1, 1, '#2c3e50', 'Image')
      + svgRect(0.05, 0.15, 0.55, 0.35, '#222', 'BIG TEXT')
      + svgRect(0.05, 0.55, 0.4, 0.12, '#333', 'subtitle')
    ),
    slots: [
      { id: 'image', label: 'Background Image', role: 'background', bounds: { x: 0, y: 0, width: 1, height: 1 }, fit: 'cover', zIndex: 0, mask: 'none', blendMode: 'normal', opacity: 100, filter: 'brightness(0.5)', required: true },
    ],
    textSlots: [
      { id: 'title', label: 'Main Title', role: 'text', bounds: { x: 0.05, y: 0.15, width: 0.6, height: 0.4 }, zIndex: 10, defaultStyle: { fontFamily: 'Inter', fontSize: 110, fontWeight: 900, color: '#ffffff', textAlign: 'left', textTransform: 'uppercase' }, placeholder: 'BIG TITLE' },
      { id: 'subtitle', label: 'Subtitle', role: 'text', bounds: { x: 0.05, y: 0.58, width: 0.5, height: 0.1 }, zIndex: 10, defaultStyle: { fontFamily: 'Inter', fontSize: 32, fontWeight: 500, color: '#f1c40f', textAlign: 'left' }, placeholder: 'Supporting text here' },
    ],
    fallbackBackground: '#0a0a0a',
    popularity: 82,
  },
];

/**
 * Seed built-in composition layouts
 * Uses upsert so it's safe to run multiple times
 */
async function seedCompositionLayouts() {
  console.log('🎨 Seeding Composition Layouts...\n');

  let created = 0;
  let updated = 0;

  for (const layout of BUILTIN_LAYOUTS) {
    try {
      const existing = await prisma.compositionLayout.findUnique({
        where: { id: layout.id },
      });

      await prisma.compositionLayout.upsert({
        where: { id: layout.id },
        update: {
          name: layout.name,
          description: layout.description,
          category: layout.category,
          tags: layout.tags,
          canvasWidth: layout.canvasWidth,
          canvasHeight: layout.canvasHeight,
          wireframeSvg: layout.wireframeSvg,
          slots: layout.slots as any,
          textSlots: layout.textSlots as any,
          fallbackBackground: layout.fallbackBackground,
          popularity: layout.popularity,
        },
        create: {
          id: layout.id,
          name: layout.name,
          description: layout.description,
          category: layout.category,
          tags: layout.tags,
          canvasWidth: layout.canvasWidth,
          canvasHeight: layout.canvasHeight,
          wireframeSvg: layout.wireframeSvg,
          slots: layout.slots as any,
          textSlots: layout.textSlots as any,
          fallbackBackground: layout.fallbackBackground,
          popularity: layout.popularity,
          builtIn: true,
          isPublic: true,
          creatorId: null,
        },
      });

      if (existing) {
        updated++;
        console.log(`   ♻️  Updated: ${layout.name}`);
      } else {
        created++;
        console.log(`   ✨ Created: ${layout.name}`);
      }
    } catch (error) {
      console.error(`   ❌ Error seeding ${layout.name}:`, error);
    }
  }

  console.log(`\n   📊 Composition Layouts: ${created} created, ${updated} updated\n`);
  return { created, updated };
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

    // Seed subscriptions for test accounts
    const { created: subsCreated, existing: subsExisting } = await seedSubscriptions();

    // Seed built-in composition layouts (always runs, even in production)
    const { created: layoutsCreated, updated: layoutsUpdated } = await seedCompositionLayouts();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE SEEDING COMPLETED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Summary:');
    console.log(`   - New users created: ${createdUsers.length}`);
    console.log(`   - Existing users found: ${existingUsers.length}`);
    console.log(`   - Total test users: ${TEST_USERS.length}`);
    console.log(`   - New admins created: ${createdAdmins.length}`);
    console.log(`   - Existing admins found: ${existingAdmins.length}`);
    console.log(`   - Total admin users: ${TEST_ADMIN_USERS.length}`);
    console.log(`   - Subscriptions created: ${subsCreated}, already existed: ${subsExisting}`);
    console.log(`   - Composition layouts: ${layoutsCreated} new, ${layoutsUpdated} updated\n`);

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
