/**
 * Session Coordination Middleware
 *
 * This middleware helps maintain login sessions during server restarts
 * by storing session state in external persistent storage (Redis/File system)
 */

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import * as redis from 'ioredis';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getJWTSecret } from '../services/jwt.service';

interface SessionData {
  userId: string;
  userType: 'admin' | 'user';
  permissions: string[];
  loginTime: number;
  lastActivity: number;
  sessionId: string;
}

interface ServerCoordinationState {
  lastRestart: number;
  activeSessionCount: number;
  backendHealth: boolean;
  frontendHealth: boolean;
}

export class SessionCoordinator {
  private redisClient: redis.Redis | null = null;
  private fallbackStoragePath: string;
  private serverStatePath: string;

  constructor() {
    this.fallbackStoragePath = path.join(process.cwd(), 'temp', 'sessions');
    this.serverStatePath = path.join(
      process.cwd(),
      'temp',
      'server-state.json'
    );
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      // Try to connect to Redis first
      if (process.env.REDIS_URL) {
        this.redisClient = new redis.Redis(process.env.REDIS_URL);
        console.log('✅ Session coordinator using Redis storage');
      } else {
        console.log('⚠️ No Redis URL found, using file-based session storage');
      }

      // Ensure fallback directory exists
      await fs.mkdir(this.fallbackStoragePath, { recursive: true });

      // Initialize server state
      await this.updateServerState({
        lastRestart: Date.now(),
        activeSessionCount: 0,
        backendHealth: true,
        frontendHealth: true,
      });
    } catch (error) {
      console.error('❌ Session coordinator initialization error:', error);
      // Fallback to file storage
      this.redisClient = null;
    }
  }

  /**
   * Store session data in persistent storage
   */
  async storeSession(
    sessionId: string,
    sessionData: SessionData
  ): Promise<void> {
    try {
      const data = JSON.stringify(sessionData);

      if (this.redisClient) {
        await this.redisClient.setex(`session:${sessionId}`, 86400, data); // 24 hours
      } else {
        const filePath = path.join(
          this.fallbackStoragePath,
          `${sessionId}.json`
        );
        await fs.writeFile(filePath, data, 'utf8');
      }
    } catch (error) {
      console.error('❌ Error storing session:', error);
    }
  }

  /**
   * Retrieve session data from persistent storage
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      let data: string | null = null;

      if (this.redisClient) {
        data = await this.redisClient.get(`session:${sessionId}`);
      } else {
        const filePath = path.join(
          this.fallbackStoragePath,
          `${sessionId}.json`
        );
        try {
          data = await fs.readFile(filePath, 'utf8');
        } catch (error) {
          if ((error as any).code !== 'ENOENT') {
            throw error;
          }
        }
      }

      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error retrieving session:', error);
      return null;
    }
  }

  /**
   * Remove session from storage
   */
  async removeSession(sessionId: string): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.del(`session:${sessionId}`);
      } else {
        const filePath = path.join(
          this.fallbackStoragePath,
          `${sessionId}.json`
        );
        await fs.unlink(filePath).catch(() => {}); // Ignore if file doesn't exist
      }
    } catch (error) {
      console.error('❌ Error removing session:', error);
    }
  }

  /**
   * Update server coordination state
   */
  async updateServerState(
    state: Partial<ServerCoordinationState>
  ): Promise<void> {
    try {
      let currentState: ServerCoordinationState = {
        lastRestart: Date.now(),
        activeSessionCount: 0,
        backendHealth: true,
        frontendHealth: true,
      };

      try {
        const existing = await fs.readFile(this.serverStatePath, 'utf8');
        currentState = { ...currentState, ...JSON.parse(existing) };
      } catch (error) {
        // File doesn't exist or is corrupted, use defaults
      }

      const newState = { ...currentState, ...state };
      await fs.writeFile(
        this.serverStatePath,
        JSON.stringify(newState, null, 2)
      );
    } catch (error) {
      console.error('❌ Error updating server state:', error);
    }
  }

  /**
   * Get current server coordination state
   */
  async getServerState(): Promise<ServerCoordinationState> {
    try {
      const data = await fs.readFile(this.serverStatePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return {
        lastRestart: Date.now(),
        activeSessionCount: 0,
        backendHealth: true,
        frontendHealth: true,
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      if (this.redisClient) {
        // Redis handles TTL automatically
        return;
      }

      // For file storage, manually clean up old sessions
      const files = await fs.readdir(this.fallbackStoragePath);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.fallbackStoragePath, file);
          try {
            const stats = await fs.stat(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
              await fs.unlink(filePath);
            }
          } catch (error) {
            // Ignore errors for individual files
          }
        }
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Global instance
const sessionCoordinator = new SessionCoordinator();

/**
 * Middleware to handle session coordination across server restarts
 */
export const sessionCoordinationMiddleware = async (
  req: Request & {
    sessionCoordinator?: SessionCoordinator;
    sessionId?: string;
  },
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Attach coordinator to request
    req.sessionCoordinator = sessionCoordinator;

    // Check for existing session
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.sessionToken;
    const token = authHeader?.replace('Bearer ', '') || cookieToken;

    if (token) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(token, getJWTSecret()) as any;
        const sessionId =
          decoded.sessionId || sessionCoordinator.generateSessionId();

        req.sessionId = sessionId;

        // Try to get persistent session data
        const sessionData = await sessionCoordinator.getSession(sessionId);

        if (sessionData) {
          // Update last activity
          sessionData.lastActivity = Date.now();
          await sessionCoordinator.storeSession(sessionId, sessionData);

          // Attach session data to request
          (req as any).sessionData = sessionData;
          (req as any).user = {
            id: sessionData.userId,
            type: sessionData.userType,
            permissions: sessionData.permissions,
          };
        }
      } catch (jwtError) {
        // Invalid token, continue without session
        console.warn('⚠️ Invalid session token:', jwtError);
      }
    }

    next();
  } catch (error) {
    console.error('❌ Session coordination middleware error:', error);
    next(); // Continue even if session coordination fails
  }
};

/**
 * Helper function to create a persistent session
 */
export const createPersistentSession = async (
  userId: string,
  userType: 'admin' | 'user',
  permissions: string[] = []
): Promise<{ token: string; sessionId: string }> => {
  const sessionId = sessionCoordinator.generateSessionId();
  const sessionData: SessionData = {
    userId,
    userType,
    permissions,
    loginTime: Date.now(),
    lastActivity: Date.now(),
    sessionId,
  };

  // Store session data
  await sessionCoordinator.storeSession(sessionId, sessionData);

  // Create JWT token
  const token = jwt.sign(
    {
      userId,
      userType,
      sessionId,
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
    },
    getJWTSecret()
  );

  return { token, sessionId };
};

/**
 * Helper function to invalidate a session
 */
export const invalidateSession = async (sessionId: string): Promise<void> => {
  await sessionCoordinator.removeSession(sessionId);
};

/**
 * Server restart notification middleware
 */
export const notifyServerRestart = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Add restart notification header
  res.setHeader('X-Server-Restart', Date.now().toString());
  res.setHeader('X-Session-Persistent', 'true');

  next();
};

/**
 * Cleanup job that should run periodically
 */
export const runSessionCleanup = async (): Promise<void> => {
  await sessionCoordinator.cleanupExpiredSessions();
  console.log('🧹 Session cleanup completed');
};

// Export the coordinator instance for direct use
export { sessionCoordinator };

export default sessionCoordinationMiddleware;
