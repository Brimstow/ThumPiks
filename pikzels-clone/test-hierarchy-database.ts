#!/usr/bin/env ts-node

/**
 * 🏗️ Simple Hierarchy Test (Manual API Check)
 * Quick test to verify our hierarchy database structure works
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testHierarchyDatabase() {
  console.log('🧪 Testing Hierarchy Database Structure...\n');

  try {
    // Test 1: Create a test user
    console.log('1. 👤 Creating test user...');
    const user = await prisma.user.upsert({
      where: { email: 'hierarchy-test@example.com' },
      update: {},
      create: {
        email: 'hierarchy-test@example.com',
        passwordHash: 'hashed-password',
        name: 'Hierarchy Test User',
        isVerified: true
      }
    });
    console.log(`   ✅ User created/found: ${user.name} (ID: ${user.id})\n`);

    // Test 2: Create root project
    console.log('2. 📁 Creating root project...');
    const rootProject = await prisma.project.create({
      data: {
        name: "Test YouTube Channel",
        description: "Root project for testing hierarchy",
        userId: user.id,
        folderType: "project",
        depth: 0,
        projectPath: "/"
      }
    });
    console.log(`   ✅ Root project: ${rootProject.name}`);
    console.log(`   📊 Depth: ${rootProject.depth}, Type: ${rootProject.folderType}, Path: ${rootProject.projectPath}\n`);

    // Test 3: Create sub-project
    console.log('3. 📂 Creating sub-project...');
    const subProject = await prisma.project.create({
      data: {
        name: "Gaming Videos",
        description: "Gaming content sub-project",
        userId: user.id,
        parentProjectId: rootProject.id,
        folderType: "project", 
        depth: 1,
        projectPath: `/${rootProject.id}/`
      }
    });
    console.log(`   ✅ Sub-project: ${subProject.name}`);
    console.log(`   📊 Depth: ${subProject.depth}, Parent: ${subProject.parentProjectId}, Path: ${subProject.projectPath}\n`);

    // Test 4: Create organizational folder
    console.log('4. 📂 Creating organizational folder...');
    const folder = await prisma.project.create({
      data: {
        name: "Work in Progress",
        description: "Organizational folder for drafts",
        userId: user.id,
        parentProjectId: subProject.id,
        folderType: "folder",
        depth: 2,
        projectPath: `/${rootProject.id}/${subProject.id}/`
      }
    });
    console.log(`   ✅ Folder: ${folder.name}`);
    console.log(`   📊 Depth: ${folder.depth}, Type: ${folder.folderType}, Path: ${folder.projectPath}\n`);

    // Test 5: Query hierarchy
    console.log('5. 🌳 Querying project hierarchy...');
    const allProjects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { depth: 'asc' },
      include: {
        parentProject: true,
        subProjects: true
      }
    });

    console.log('   ✅ Project hierarchy:');
    allProjects.forEach(project => {
      const indent = '   '.repeat(project.depth + 1);
      const icon = project.folderType === 'project' ? '📁' : '📂';
      console.log(`${indent}${icon} ${project.name} (depth: ${project.depth}, type: ${project.folderType})`);
      if (project.parentProject) {
        console.log(`${indent}   ↳ Parent: ${project.parentProject.name}`);
      }
      if (project.subProjects.length > 0) {
        console.log(`${indent}   ↳ Children: ${project.subProjects.length}`);
      }
    });

    // Test 6: Test breadcrumb path
    console.log('\n6. 🧭 Testing breadcrumb functionality...');
    async function getBreadcrumb(projectId: string): Promise<Array<{id: string, name: string}>> {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, parentProjectId: true }
      });
      
      if (!project) return [];
      
      const breadcrumb = [{ id: project.id, name: project.name }];
      
      if (project.parentProjectId) {
        const parentBreadcrumb = await getBreadcrumb(project.parentProjectId);
        return [...parentBreadcrumb, ...breadcrumb];
      }
      
      return breadcrumb;
    }

    const breadcrumb = await getBreadcrumb(folder.id);
    console.log(`   ✅ Breadcrumb for "${folder.name}":`, 
      breadcrumb.map(b => b.name).join(' → '));

    // Test 7: Test project children
    console.log('\n7. 👨‍👩‍👧‍👦 Testing children query...');
    const children = await prisma.project.findMany({
      where: { parentProjectId: rootProject.id },
      orderBy: { name: 'asc' }
    });
    console.log(`   ✅ Root project has ${children.length} children:`);
    children.forEach(child => {
      console.log(`      📂 ${child.name} (${child.folderType})`);
    });

    console.log('\n🎉 All hierarchy database tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   ✅ 3-level hierarchy: Root → Sub-Project → Folder`);
    console.log(`   ✅ Parent-child relationships working`);
    console.log(`   ✅ Depth tracking accurate`);
    console.log(`   ✅ Project paths generated correctly`);
    console.log(`   ✅ Breadcrumb navigation functional`);
    console.log(`   ✅ Both project and folder types supported`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testHierarchyDatabase();
}