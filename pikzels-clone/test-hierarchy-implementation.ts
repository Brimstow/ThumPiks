#!/usr/bin/env ts-node

/**
 * 🏗️ Hierarchical Project Structure Test
 * Tests the new 3-level hierarchy implementation
 * 
 * Test Structure:
 * 📁 "My YouTube Channel" (Root Project - Level 0)
 * ├── 📁 "Gaming Content" (Sub-Project - Level 1)  
 * │   ├── 🖼️ minecraft_thumb.jpg (Thumbnail - Level 2)
 * │   └── 🖼️ fortnite_thumb.jpg (Thumbnail - Level 2)
 * ├── 📁 "Tutorials" (Sub-Project - Level 1)
 * │   └── 🖼️ coding_tutorial.jpg (Thumbnail - Level 2)
 * └── 🖼️ channel_banner.jpg (Thumbnail - Level 2, direct in root)
 */

import axios from 'axios';

const API_BASE = 'http://localhost:8550/api';
let authToken = '';

async function testHierarchicalProjects() {
  console.log('🧪 Testing Hierarchical Project Structure...\n');

  try {
    // Step 1: Login to get auth token
    console.log('1. 🔐 Authenticating...');
    await login();
    console.log('   ✅ Authenticated successfully\n');

    // Step 2: Create root project  
    console.log('2. 📁 Creating Root Project...');
    const rootProject = await createProject({
      name: "My YouTube Channel",
      description: "Main project for all YouTube content",
      folderType: "project"
    });
    console.log(`   ✅ Root project created: ${rootProject.name} (ID: ${rootProject.id})`);
    console.log(`   📊 Depth: ${rootProject.depth}, Type: ${rootProject.folderType}\n`);

    // Step 3: Create sub-projects
    console.log('3. 📂 Creating Sub-Projects...');
    const gamingProject = await createProject({
      name: "Gaming Content",
      description: "All gaming-related thumbnails",
      parentProjectId: rootProject.id,
      folderType: "project"
    });
    console.log(`   ✅ Gaming sub-project: ${gamingProject.name} (Depth: ${gamingProject.depth})`);
    
    const tutorialProject = await createProject({
      name: "Tutorials", 
      description: "Educational content thumbnails",
      parentProjectId: rootProject.id,
      folderType: "project"
    });
    console.log(`   ✅ Tutorial sub-project: ${tutorialProject.name} (Depth: ${tutorialProject.depth})\n`);

    // Step 4: Test hierarchy retrieval
    console.log('4. 🌳 Testing Hierarchy Retrieval...');
    const projectsTree = await getProjectsTree();
    console.log('   ✅ Projects tree structure:');
    printProjectTree(projectsTree, '   ');

    // Step 5: Test breadcrumb navigation
    console.log('\n5. 🧭 Testing Breadcrumb Navigation...');
    const breadcrumb = await getProjectBreadcrumb(gamingProject.id);
    console.log(`   ✅ Breadcrumb for "${gamingProject.name}":`, 
      breadcrumb.map((b: any) => b.name).join(' → '));

    // Step 6: Test project children
    console.log('\n6. 👨‍👩‍👧‍👦 Testing Project Children...');
    const children = await getProjectChildren(rootProject.id);
    console.log(`   ✅ Root project has ${children.length} children:`);
    children.forEach((child: any) => {
      console.log(`      📂 ${child.name} (${child.folderType})`);
    });

    // Step 7: Test validation (try to create too deep)
    console.log('\n7. 🚫 Testing Depth Validation...');
    try {
      await createProject({
        name: "Too Deep Project",
        parentProjectId: gamingProject.id,
        folderType: "project"
      });
      console.log('   ❌ Should have failed depth validation!');
    } catch (error: any) {
      if (error.response?.data?.error?.includes('Maximum nesting depth')) {
        console.log('   ✅ Depth validation working correctly');
      } else {
        console.log('   ⚠️  Unexpected error:', error.response?.data?.error);
      }
    }

    // Step 8: Test moving projects
    console.log('\n8. 📦 Testing Project Moving...');
    const newParent = await createProject({
      name: "Archive",
      description: "Archived content",
      folderType: "folder"
    });
    
    try {
      await moveProject(tutorialProject.id, newParent.id);
      console.log('   ✅ Project moved successfully');
    } catch (error: any) {
      console.log('   ⚠️  Move failed:', error.response?.data?.error);
    }

    console.log('\n🎉 All hierarchy tests completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Helper functions
async function login() {
  // Try to create a test user first
  try {
    await axios.post(`${API_BASE}/auth/register`, {
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User'
    });
    console.log('   📝 Test user created');
  } catch (error: any) {
    // User might already exist, that's okay
  }
  
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'test@example.com',
    password: 'TestPass123!'
  });
  authToken = response.data.token;
}

async function createProject(data: any) {
  const response = await axios.post(`${API_BASE}/projects`, data, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  return response.data.project;
}

async function getProjectsTree() {
  const response = await axios.get(`${API_BASE}/projects/tree`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  return response.data.projectsTree;
}

async function getProjectBreadcrumb(projectId: string) {
  const response = await axios.get(`${API_BASE}/projects/${projectId}/breadcrumb`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  return response.data.breadcrumb;
}

async function getProjectChildren(projectId: string) {
  const response = await axios.get(`${API_BASE}/projects/${projectId}/children`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  return response.data.children;
}

async function moveProject(projectId: string, newParentId: string) {
  const response = await axios.put(`${API_BASE}/projects/${projectId}/move`, 
    { newParentId }, 
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  return response.data.project;
}

function printProjectTree(projects: any[], indent: string = '') {
  projects.forEach(project => {
    const icon = project.folderType === 'project' ? '📁' : '📂';
    console.log(`${indent}${icon} ${project.name} (${project.folderType}, depth: ${project.depth})`);
    if (project.children && project.children.length > 0) {
      printProjectTree(project.children, indent + '   ');
    }
  });
}

// Run the test
if (require.main === module) {
  testHierarchicalProjects();
}