// Database model interfaces (matching Prisma schema)

export interface User {
  id: string;
  email: string;
  name?: string;
  password: string;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  parentId?: string;
  type: 'project' | 'folder';
  createdAt: Date;
  updatedAt: Date;
}

export interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  parameters: Record<string, any>;
  style?: string;
  featured: boolean;
  featuredAt?: Date;
  projectId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialShare {
  id: string;
  thumbnailId: string;
  userId: string;
  platform: string;
  status: 'pending' | 'success' | 'failed';
  shareUrl?: string;
  shareId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  parameters: Record<string, any>;
  category?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}