/**
 * Admin Mock Data
 * 
 * Centralized mock data for all admin components.
 * Used in development environment to provide realistic data
 * without requiring the backend to be running.
 * 
 * Each function simulates API latency with a configurable delay.
 */

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

const MOCK_DELAY_MS = 400;

async function mockDelay(ms: number = MOCK_DELAY_MS): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number): Date {
  return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════════════════════════════
// AUTH MOCK
// ═══════════════════════════════════════════════════════════════════

export async function mockAdminLogin(email: string, password: string) {
  await mockDelay(600);

  if (email === 'admin@example.com' && password === 'AdminPass123!') {
    return {
      success: true,
      data: {
        token: 'mock-admin-jwt-token-' + Date.now(),
        user: {
          id: 'admin_1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'super_admin',
          permissions: [
            'users.view', 'users.create', 'users.update', 'users.delete', 'users.ban',
            'content.view', 'content.moderate', 'content.delete',
            'system.config', 'system.health', 'system.logs',
            'analytics.view', 'analytics.export',
            'support.view', 'support.manage',
            'admin.roles', 'admin.permissions',
          ],
          avatar: null,
          lastLogin: new Date().toISOString(),
        },
      },
    };
  }

  return {
    success: false,
    error: 'Invalid email or password',
  };
}

export async function mockAdminMe() {
  await mockDelay(200);
  return {
    success: true,
    data: {
      id: 'admin_1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'super_admin',
      permissions: [
        'users.view', 'users.create', 'users.update', 'users.delete', 'users.ban',
        'content.view', 'content.moderate', 'content.delete',
        'system.config', 'system.health', 'system.logs',
        'analytics.view', 'analytics.export',
        'support.view', 'support.manage',
        'admin.roles', 'admin.permissions',
      ],
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// USER MANAGEMENT MOCK
// ═══════════════════════════════════════════════════════════════════

const MOCK_USERS = Array.from({ length: 42 }, (_, i) => ({
  id: `user_${i + 1}`,
  email: `user${i + 1}@example.com`,
  name: [
    'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Wilson',
    'Frank Castle', 'Grace Lee', 'Hank Pym', 'Iris West', 'Jack Dawson',
    'Karen Page', 'Leo Messi', 'Mia Chen', 'Noah Kim', 'Olivia Park',
  ][i % 15],
  isActive: Math.random() > 0.15,
  isVerified: Math.random() > 0.2,
  isAdmin: i < 3,
  role: i === 0 ? 'super_admin' : i < 3 ? 'admin' : i < 8 ? 'moderator' : 'user',
  createdAt: randomDate(365).toISOString(),
  lastLoginAt: randomDate(30).toISOString(),
  thumbnailCount: randomInt(0, 150),
  projectCount: randomInt(0, 20),
  subscription: randomItem(['free', 'starter', 'pro', 'ultra_pro']),
  creditsRemaining: randomInt(0, 500),
}));

export async function mockGetUsers(params?: Record<string, string | number | boolean | undefined>) {
  await mockDelay();
  
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 20;
  const search = String(params?.search || '').toLowerCase();

  let filtered = [...MOCK_USERS];

  if (search) {
    filtered = filtered.filter(u =>
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    );
  }

  if (params?.isActive !== undefined) {
    filtered = filtered.filter(u => u.isActive === (params.isActive === true || params.isActive === 'true'));
  }

  const start = (page - 1) * limit;
  const paged = filtered.slice(start, start + limit);

  return {
    success: true,
    data: paged,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filtered.length / limit),
      totalItems: filtered.length,
      hasNext: start + limit < filtered.length,
      hasPrev: page > 1,
    },
  };
}

export async function mockGetUserStats() {
  await mockDelay(300);
  return {
    success: true,
    data: {
      totalUsers: MOCK_USERS.length,
      activeUsers: MOCK_USERS.filter(u => u.isActive).length,
      verifiedUsers: MOCK_USERS.filter(u => u.isVerified).length,
      adminUsers: MOCK_USERS.filter(u => u.isAdmin).length,
      newUsersThisMonth: randomInt(5, 15),
      subscriptionBreakdown: {
        free: MOCK_USERS.filter(u => u.subscription === 'free').length,
        starter: MOCK_USERS.filter(u => u.subscription === 'starter').length,
        pro: MOCK_USERS.filter(u => u.subscription === 'pro').length,
        ultra_pro: MOCK_USERS.filter(u => u.subscription === 'ultra_pro').length,
      },
    },
  };
}

export async function mockGetUserById(userId: string) {
  await mockDelay(200);
  const user = MOCK_USERS.find(u => u.id === userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  return { success: true, data: user };
}

export async function mockUpdateUser(userId: string, updates: Record<string, unknown>) {
  await mockDelay(400);
  const idx = MOCK_USERS.findIndex(u => u.id === userId);
  if (idx === -1) {
    return { success: false, error: 'User not found' };
  }
  Object.assign(MOCK_USERS[idx], updates);
  return { success: true, data: MOCK_USERS[idx], message: 'User updated successfully' };
}

export async function mockDeleteUser(userId: string) {
  await mockDelay(400);
  const idx = MOCK_USERS.findIndex(u => u.id === userId);
  if (idx === -1) {
    return { success: false, error: 'User not found' };
  }
  MOCK_USERS.splice(idx, 1);
  return { success: true, message: 'User deleted successfully' };
}

export async function mockCreateUser(userData: Record<string, unknown>) {
  await mockDelay(500);
  const newUser = {
    id: `user_${Date.now()}`,
    email: String(userData.email || ''),
    name: String(userData.name || ''),
    isActive: true,
    isVerified: false,
    isAdmin: false,
    role: 'user',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    thumbnailCount: 0,
    projectCount: 0,
    subscription: 'free',
    creditsRemaining: 10,
  };
  MOCK_USERS.push(newUser as typeof MOCK_USERS[0]);
  return { success: true, data: newUser, message: 'User created successfully' };
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS MOCK
// ═══════════════════════════════════════════════════════════════════

export async function mockGetAnalyticsOverview(params?: Record<string, string | number | boolean | undefined>) {
  await mockDelay(500);
  const days = params?.period === '7d' ? 7 : params?.period === '90d' ? 90 : 30;

  return {
    success: true,
    data: {
      overview: {
        totalUsers: 2543,
        activeUsers: 1876,
        totalRevenue: 45670,
        monthlyGrowth: 12.5,
      },
      userMetrics: {
        newUsers: 324,
        retentionRate: 78.5,
        averageSessionTime: 245,
        churnRate: 4.2,
      },
      contentMetrics: {
        totalThumbnails: 8921,
        newThumbnails: 567,
        totalProjects: 1234,
        averagePerUser: 3.5,
        popularCategories: [
          { name: 'YouTube Thumbnails', count: 4015, percentage: 45 },
          { name: 'Social Media', count: 2230, percentage: 25 },
          { name: 'Blog Headers', count: 1338, percentage: 15 },
          { name: 'Presentations', count: 892, percentage: 10 },
          { name: 'Other', count: 446, percentage: 5 },
        ],
      },
      revenueMetrics: {
        monthlyRevenue: 12450,
        averageRevenuePerUser: 18.50,
        subscriptionBreakdown: [
          { plan: 'Basic', count: 1234, revenue: 6170, percentage: 35 },
          { plan: 'Pro', count: 876, revenue: 17520, percentage: 50 },
          { plan: 'Enterprise', count: 123, revenue: 12300, percentage: 15 },
        ],
      },
      chartData: Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        return {
          date: date.toISOString().split('T')[0],
          users: randomInt(30, 120),
          thumbnails: randomInt(50, 200),
          revenue: randomInt(200, 800),
        };
      }),
    },
  };
}

export async function mockGetUserMetrics(params?: Record<string, string | number | boolean | undefined>) {
  await mockDelay(400);
  return {
    success: true,
    data: {
      totalUsers: 2543,
      activeUsers: 1876,
      newUsersToday: randomInt(5, 25),
      newUsersThisWeek: randomInt(50, 150),
      retentionRate: 78.5,
      averageSessionTime: 245,
    },
  };
}

export async function mockGetContentMetrics() {
  await mockDelay(400);
  return {
    success: true,
    data: {
      totalThumbnails: 8921,
      newThumbnailsToday: randomInt(20, 80),
      totalProjects: 1234,
      totalTemplates: 156,
      storageUsed: '12.4 GB',
      averageProcessingTime: '2.3s',
    },
  };
}

export async function mockGetRevenueMetrics() {
  await mockDelay(400);
  return {
    success: true,
    data: {
      monthlyRevenue: 12450,
      yearlyRevenue: 145800,
      averageRevenuePerUser: 18.50,
      mrr: 12450,
      arr: 149400,
      churnRate: 4.2,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// SYSTEM MONITORING MOCK
// ═══════════════════════════════════════════════════════════════════

export async function mockGetSystemHealth() {
  await mockDelay(300);
  return {
    success: true,
    data: {
      overall: 'healthy' as const,
      uptime: 99.97,
      timestamp: new Date().toISOString(),
      services: [
        { service: 'API Server', status: 'healthy', responseTime: randomInt(10, 50), lastChecked: new Date().toISOString() },
        { service: 'Database (PostgreSQL)', status: 'healthy', responseTime: randomInt(5, 20), lastChecked: new Date().toISOString() },
        { service: 'Redis Cache', status: 'healthy', responseTime: randomInt(1, 10), lastChecked: new Date().toISOString() },
        { service: 'Image Processing', status: Math.random() > 0.9 ? 'degraded' : 'healthy', responseTime: randomInt(100, 500), lastChecked: new Date().toISOString() },
        { service: 'AI Service (OpenRouter)', status: 'healthy', responseTime: randomInt(200, 800), lastChecked: new Date().toISOString() },
        { service: 'Email Service (SMTP)', status: 'healthy', responseTime: randomInt(50, 200), lastChecked: new Date().toISOString() },
      ],
    },
  };
}

export async function mockGetPerformanceMetrics() {
  await mockDelay(300);
  return {
    success: true,
    data: {
      cpu: { usage: randomInt(15, 65), loadAverage: [1.2, 1.5, 1.8] },
      memory: { used: randomInt(1024, 3072), total: 4096, percentage: randomInt(30, 75) },
      disk: { used: randomInt(10, 40), total: 50, percentage: randomInt(20, 80) },
      network: { bytesIn: randomInt(1000000, 5000000), bytesOut: randomInt(2000000, 8000000) },
      requests: {
        total: randomInt(10000, 50000),
        perMinute: randomInt(50, 200),
        averageResponseTime: randomInt(50, 300),
        errorRate: Math.random() * 2,
      },
      history: Array.from({ length: 20 }, () => ({
        cpu: randomInt(15, 65),
        memory: randomInt(30, 75),
        requests: randomInt(50, 200),
      })),
    },
  };
}

export async function mockGetSystemAlerts() {
  await mockDelay(300);
  return {
    success: true,
    data: [
      {
        id: 'alert_1',
        type: 'warning',
        title: 'High memory usage detected',
        message: 'Memory usage exceeded 75% threshold at 14:32 UTC',
        timestamp: randomDate(1).toISOString(),
        acknowledged: false,
        severity: 'medium',
      },
      {
        id: 'alert_2',
        type: 'info',
        title: 'Database backup completed',
        message: 'Automated daily backup completed successfully (2.3 GB)',
        timestamp: randomDate(1).toISOString(),
        acknowledged: true,
        severity: 'low',
      },
      {
        id: 'alert_3',
        type: 'error',
        title: 'Image processing timeout',
        message: '3 thumbnail generation jobs timed out in the last hour',
        timestamp: randomDate(0.5).toISOString(),
        acknowledged: false,
        severity: 'high',
      },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOGS MOCK
// ═══════════════════════════════════════════════════════════════════

const MOCK_USERS_SHORT = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Super Admin' },
  { id: '2', name: 'John Smith', email: 'john@example.com', role: 'Admin' },
  { id: '3', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Moderator' },
  { id: '4', name: 'Mike Davis', email: 'mike@example.com', role: 'User' },
];

const MOCK_LOG_ACTIONS = [
  { action: 'user.login', resource: 'authentication', severity: 'low' as const, category: 'authentication' as const },
  { action: 'user.logout', resource: 'authentication', severity: 'low' as const, category: 'authentication' as const },
  { action: 'user.create', resource: 'user', severity: 'medium' as const, category: 'admin' as const },
  { action: 'user.update', resource: 'user', severity: 'medium' as const, category: 'data' as const },
  { action: 'user.delete', resource: 'user', severity: 'high' as const, category: 'admin' as const },
  { action: 'thumbnail.create', resource: 'thumbnail', severity: 'low' as const, category: 'data' as const },
  { action: 'thumbnail.delete', resource: 'thumbnail', severity: 'medium' as const, category: 'data' as const },
  { action: 'settings.update', resource: 'system_settings', severity: 'high' as const, category: 'system' as const },
  { action: 'security.alert', resource: 'security', severity: 'critical' as const, category: 'security' as const },
  { action: 'permission.grant', resource: 'permissions', severity: 'high' as const, category: 'authorization' as const },
];

export async function mockGetActivityLogs(params?: Record<string, string | number | boolean | undefined>) {
  await mockDelay(400);

  const logs = Array.from({ length: 50 }, (_, i) => {
    const user = randomItem(MOCK_USERS_SHORT);
    const actionData = randomItem(MOCK_LOG_ACTIONS);
    const success = Math.random() > 0.1;

    return {
      id: `log_${i + 1}`,
      timestamp: randomDate(7).toISOString(),
      user,
      action: actionData.action,
      resource: actionData.resource,
      resourceId: `${actionData.resource}_${randomInt(1, 1000)}`,
      details: `${user.name} performed ${actionData.action}`,
      ipAddress: `192.168.${randomInt(0, 255)}.${randomInt(0, 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      severity: actionData.severity,
      category: actionData.category,
      success,
      metadata: {
        duration: randomInt(100, 1000),
        endpoint: `/${actionData.resource}`,
        method: randomItem(['GET', 'POST', 'PUT', 'DELETE']),
      },
    };
  });

  // Sort by timestamp desc
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    success: true,
    data: logs,
  };
}

// ═══════════════════════════════════════════════════════════════════
// CONTENT MANAGEMENT MOCK
// ═══════════════════════════════════════════════════════════════════

const CONTENT_AUTHORS = ['John Doe', 'Jane Smith', 'Mike Johnson'];
const CONTENT_STATUSES: ('published' | 'draft' | 'archived')[] = ['published', 'draft', 'archived'];

function generateMockContent() {
  const thumbnails = Array.from({ length: 15 }, (_, i) => ({
    id: `thumb_${i + 1}`,
    type: 'thumbnail' as const,
    title: `YouTube Thumbnail ${i + 1}`,
    description: 'Professional YouTube thumbnail design with modern styling',
    author: randomItem(CONTENT_AUTHORS),
    authorId: `user_${randomInt(1, 3)}`,
    createdAt: randomDate(30).toISOString(),
    updatedAt: randomDate(7).toISOString(),
    status: randomItem(CONTENT_STATUSES),
    tags: ['gaming', 'tutorial', 'lifestyle', 'tech', 'entertainment'].slice(0, randomInt(1, 3)),
    thumbnailUrl: `https://picsum.photos/400/300?random=${i + 1}`,
    downloads: randomInt(0, 1000),
    views: randomInt(0, 5000),
    rating: Math.random() * 5,
    featured: Math.random() > 0.8,
    category: randomItem(['Gaming', 'Education', 'Lifestyle', 'Technology']),
    size: { width: 1920, height: 1080 },
  }));

  const templates = Array.from({ length: 10 }, (_, i) => ({
    id: `template_${i + 1}`,
    type: 'template' as const,
    title: `Template Design ${i + 1}`,
    description: 'Customizable template for various use cases',
    author: randomItem(CONTENT_AUTHORS),
    authorId: `user_${randomInt(1, 3)}`,
    createdAt: randomDate(30).toISOString(),
    updatedAt: randomDate(7).toISOString(),
    status: randomItem(CONTENT_STATUSES),
    tags: ['modern', 'minimal', 'corporate', 'creative', 'colorful'].slice(0, randomInt(1, 3)),
    thumbnailUrl: `https://picsum.photos/400/300?random=${i + 16}`,
    downloads: randomInt(0, 500),
    views: randomInt(0, 2000),
    rating: Math.random() * 5,
    featured: Math.random() > 0.7,
    category: randomItem(['Business', 'Social Media', 'Marketing', 'Personal']),
    size: { width: 1080, height: 1080 },
  }));

  const projects = Array.from({ length: 8 }, (_, i) => ({
    id: `project_${i + 1}`,
    type: 'project' as const,
    title: `User Project ${i + 1}`,
    description: 'Custom project created by user',
    author: randomItem(CONTENT_AUTHORS),
    authorId: `user_${randomInt(1, 3)}`,
    createdAt: randomDate(30).toISOString(),
    updatedAt: randomDate(7).toISOString(),
    status: randomItem(CONTENT_STATUSES),
    tags: ['custom', 'personal', 'business', 'creative'].slice(0, randomInt(1, 2)),
    thumbnailUrl: `https://picsum.photos/400/300?random=${i + 26}`,
    downloads: randomInt(0, 100),
    views: randomInt(0, 500),
    rating: Math.random() * 5,
    featured: false,
    category: randomItem(['Personal', 'Business', 'Creative']),
    size: { width: 1200, height: 800 },
  }));

  return [...thumbnails, ...templates, ...projects];
}

export async function mockGetContent(params?: Record<string, string | number | boolean | undefined>) {
  await mockDelay();
  const content = generateMockContent();
  return { success: true, data: content };
}

export async function mockUpdateContentStatus(ids: string[], status: string) {
  await mockDelay(300);
  return { success: true, message: `${ids.length} item(s) updated to ${status}` };
}

export async function mockDeleteContent(ids: string[]) {
  await mockDelay(300);
  return { success: true, message: `${ids.length} item(s) deleted` };
}

export async function mockToggleContentFeatured(ids: string[]) {
  await mockDelay(200);
  return { success: true, message: `${ids.length} item(s) featured status toggled` };
}

// ═══════════════════════════════════════════════════════════════════
// ROLE & PERMISSION MANAGEMENT MOCK
// ═══════════════════════════════════════════════════════════════════

const MOCK_PERMISSIONS = [
  { id: 'users.view', name: 'View Users', description: 'View user profiles and information', category: 'User Management' },
  { id: 'users.create', name: 'Create Users', description: 'Create new user accounts', category: 'User Management' },
  { id: 'users.edit', name: 'Edit Users', description: 'Modify user profiles and settings', category: 'User Management' },
  { id: 'users.delete', name: 'Delete Users', description: 'Remove user accounts', category: 'User Management' },
  { id: 'content.view', name: 'View Content', description: 'View thumbnails and projects', category: 'Content Management' },
  { id: 'content.create', name: 'Create Content', description: 'Create new content', category: 'Content Management' },
  { id: 'content.edit', name: 'Edit Content', description: 'Modify existing content', category: 'Content Management' },
  { id: 'content.delete', name: 'Delete Content', description: 'Remove content', category: 'Content Management' },
  { id: 'analytics.view', name: 'View Analytics', description: 'Access analytics dashboard', category: 'Analytics' },
  { id: 'system.config', name: 'System Config', description: 'Configure system settings', category: 'System' },
  { id: 'system.health', name: 'System Health', description: 'Monitor system health', category: 'System' },
  { id: 'system.logs', name: 'System Logs', description: 'View audit logs', category: 'System' },
  { id: 'admin.roles', name: 'Manage Roles', description: 'Create and manage user roles', category: 'Administration' },
];

const MOCK_ROLES = [
  { id: 'super_admin', name: 'Super Admin', description: 'Full system access with all permissions', permissions: MOCK_PERMISSIONS.map(p => p.id), userCount: 2, isSystemRole: true, color: 'bg-red-500' },
  { id: 'admin', name: 'Admin', description: 'Administrative access with most permissions', permissions: ['users.view', 'users.create', 'users.edit', 'content.view', 'content.create', 'content.edit', 'analytics.view', 'system.health'], userCount: 5, isSystemRole: true, color: 'bg-blue-500' },
  { id: 'moderator', name: 'Moderator', description: 'Content moderation and user management', permissions: ['users.view', 'content.view', 'content.edit', 'content.delete'], userCount: 12, isSystemRole: false, color: 'bg-green-500' },
  { id: 'viewer', name: 'Viewer', description: 'Read-only access to analytics and content', permissions: ['content.view', 'analytics.view'], userCount: 25, isSystemRole: false, color: 'bg-purple-500' },
];

const MOCK_ROLE_USERS = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', roles: ['super_admin'], lastActive: new Date().toISOString(), status: 'active' },
  { id: '2', name: 'John Manager', email: 'john@example.com', roles: ['admin'], lastActive: new Date().toISOString(), status: 'active' },
  { id: '3', name: 'Sarah Mod', email: 'sarah@example.com', roles: ['moderator'], lastActive: new Date().toISOString(), status: 'active' },
  { id: '4', name: 'Mike Viewer', email: 'mike@example.com', roles: ['viewer'], lastActive: new Date().toISOString(), status: 'inactive' },
];

export async function mockGetRoles() {
  await mockDelay();
  return { success: true, data: { roles: MOCK_ROLES, permissions: MOCK_PERMISSIONS, users: MOCK_ROLE_USERS } };
}

export async function mockCreateRole(role: Record<string, unknown>) {
  await mockDelay(300);
  return { success: true, data: { ...role, id: `role_${Date.now()}`, userCount: 0 } };
}

export async function mockUpdateRole(roleId: string, data: Record<string, unknown>) {
  await mockDelay(300);
  return { success: true, message: `Role ${roleId} updated` };
}

export async function mockDeleteRole(roleId: string) {
  await mockDelay(300);
  return { success: true, message: `Role ${roleId} deleted` };
}

// ═══════════════════════════════════════════════════════════════════
// SETTINGS MOCK
// ═══════════════════════════════════════════════════════════════════

const MOCK_SETTINGS_DATA = {
  general: {
    app_name: 'Thumbnail Creator Pro',
    app_description: 'Create stunning thumbnails for your content with our professional tools',
    maintenance_mode: false,
    max_file_size: 50,
    timezone: 'UTC',
  },
  security: {
    password_min_length: 8,
    session_timeout: 60,
    max_login_attempts: 5,
    two_factor_required: false,
    jwt_secret: '*********************',
  },
  email: {
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: 'noreply@thumbnailcreator.com',
    smtp_password: '*********************',
    email_from_name: 'Thumbnail Creator Pro',
    email_notifications: true,
  },
  database: {
    db_connection_pool: 10,
    db_query_timeout: 30,
    enable_query_logging: false,
    backup_frequency: 'daily',
  },
  api: {
    api_rate_limit: 100,
    cors_origins: 'https://thumbnailcreator.com,https://app.thumbnailcreator.com',
    cdn_url: 'https://cdn.thumbnailcreator.com',
    storage_provider: 'aws_s3',
    aws_access_key: '*********************',
  },
  ui: {
    primary_color: '#3B82F6',
    secondary_color: '#8B5CF6',
    dark_mode_default: false,
    show_welcome_tour: true,
    custom_css: '/* Custom styles go here */',
  },
};

export async function mockGetSettings() {
  await mockDelay();
  return { success: true, data: MOCK_SETTINGS_DATA };
}

export async function mockSaveSettings(changes: Record<string, unknown>) {
  await mockDelay(800);
  return { success: true, message: 'Settings saved successfully' };
}

// ═══════════════════════════════════════════════════════════════════
// SITEMAP MOCK
// ═══════════════════════════════════════════════════════════════════

export async function mockGetSitemapStats() {
  await mockDelay();
  return {
    success: true,
    data: {
      totalUrls: 1247,
      indexedUrls: 1089,
      pendingUrls: 158,
      errorUrls: 23,
      lastGenerated: '2024-01-15T10:30:00Z',
      fileSize: '2.3 MB',
      avgClickThrough: 3.2,
    },
  };
}

export async function mockGetSitemapEntries() {
  await mockDelay();
  return {
    success: true,
    data: {
      entries: [
        { id: '1', url: 'https://thumbnailcreator.com/', lastModified: '2024-01-15T10:00:00Z', changeFreq: 'daily', priority: 1.0, status: 'active', type: 'page', indexStatus: 'indexed', crawledAt: '2024-01-15T08:30:00Z', clicks: 1250, impressions: 5670 },
        { id: '2', url: 'https://thumbnailcreator.com/templates', lastModified: '2024-01-14T15:20:00Z', changeFreq: 'weekly', priority: 0.8, status: 'active', type: 'page', indexStatus: 'indexed', crawledAt: '2024-01-14T12:15:00Z', clicks: 890, impressions: 3420 },
        { id: '3', url: 'https://thumbnailcreator.com/thumbnails/gaming-header-123', lastModified: '2024-01-13T09:45:00Z', changeFreq: 'monthly', priority: 0.6, status: 'active', type: 'thumbnail', indexStatus: 'indexed', crawledAt: '2024-01-13T14:20:00Z', clicks: 45, impressions: 180 },
        { id: '4', url: 'https://thumbnailcreator.com/user/johndoe', lastModified: '2024-01-12T16:30:00Z', changeFreq: 'weekly', priority: 0.4, status: 'pending', type: 'user_profile', indexStatus: 'not_indexed', clicks: 12, impressions: 67 },
        { id: '5', url: 'https://thumbnailcreator.com/templates/youtube-banner-template', lastModified: '2024-01-11T11:15:00Z', changeFreq: 'monthly', priority: 0.7, status: 'active', type: 'template', indexStatus: 'error', clicks: 0, impressions: 0 },
      ],
    },
  };
}

export async function mockGenerateSitemap() {
  await mockDelay(1500);
  return { success: true, message: 'Sitemap generated successfully', data: { urlCount: 1247, fileSize: '2.3 MB' } };
}

export async function mockExportSitemap() {
  await mockDelay(600);
  return { success: true, data: '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://thumbnailcreator.com/</loc></url></urlset>' };
}
