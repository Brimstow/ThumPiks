import { Request } from 'express';

// User roles for authorization
export type UserRole = 'admin' | 'user';

// Permission types for fine-grained access control
export type Permission =
  | 'thumbnails:read'
  | 'thumbnails:write'
  | 'thumbnails:delete'
  | 'projects:read'
  | 'projects:write'
  | 'projects:delete'
  | 'analytics:read'
  | 'social:share'
  | 'admin:manage';

// Secure user context with read-only properties
export interface SecureUser {
  readonly id: string;
  readonly email: string;
  readonly name?: string;
  readonly role: UserRole;
  readonly permissions: ReadonlyArray<Permission>;
  readonly sessionId: string;
  readonly lastActivity: Date;
}

// Security context for request tracking
export interface SecurityContext {
  readonly requestId: string;
  readonly clientIP: string;
  readonly userAgent: string;
  readonly timestamp: Date;
  readonly rateLimitInfo?: {
    remaining: number;
    reset: Date;
  };
}

// Enhanced AuthRequest with security features
export interface AuthRequest extends Request {
  user?: SecureUser;
  security?: SecurityContext;
}

// Token payload for JWT
export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  sessionId: string;
  role: UserRole;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

// API Response types for consistency
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Pagination interface
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Base controller response structure
export interface BaseResponse {
  status: number;
  message: string;
  timestamp: string;
}