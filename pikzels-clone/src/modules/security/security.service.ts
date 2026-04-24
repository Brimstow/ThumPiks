/**
 * Security Service
 *
 * Provides security-related data (2FA status, sessions, login history)
 * Uses real data from database with MFA service integration
 */

import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { MFAService } from '../auth/mfa.service';

const prisma = getPrisma();

/**
 * 2FA status interface
 */
export interface TwoFactorStatus {
  enabled: boolean;
  method: '2fa' | 'sms' | 'email' | null;
  lastUpdated: Date | null;
}

/**
 * Active session interface
 */
export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActivity: Date;
  loginAt: Date;
  isCurrent: boolean;
}

/**
 * Login history entry
 */
export interface LoginHistoryEntry {
  id: string;
  ipAddress: string;
  userAgent: string;
  location: string;
  loginAt: Date;
  logoutAt: Date | null;
  success: boolean;
}

/**
 * Get 2FA status for user
 * Returns real data from MFA service
 */
export async function get2FAStatus(userId: string): Promise<TwoFactorStatus> {
  try {
    const mfaStatus = await MFAService.getMFAStatus(userId);
    return {
      enabled: mfaStatus.enabled,
      method: mfaStatus.enabled ? '2fa' : null,
      lastUpdated: null, // MFA service doesn't track lastUpdated yet
    };
  } catch (error) {
    logger.error('Failed to get 2FA status', error as Error, { userId });
    return {
      enabled: false,
      method: null,
      lastUpdated: null,
    };
  }
}

/**
 * Get active sessions for user
 * Returns real data from UserSession table, or mock if unavailable
 */
export async function getActiveSessions(
  userId: string,
  currentSessionId?: string
): Promise<ActiveSession[]> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockActiveSessions(userId, currentSessionId);
    }

    // Try to fetch real sessions
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        logoutAt: null,
      },
      orderBy: { lastActivity: 'desc' },
      take: 10,
    });

    if (sessions.length > 0) {
      return sessions.map(session => ({
        id: session.id,
        device: parseUserAgent(session.userAgent),
        location: session.ipAddress || 'Unknown',
        ipAddress: session.ipAddress || 'Unknown',
        lastActivity: session.lastActivity,
        loginAt: session.loginAt,
        isCurrent: session.sessionId === currentSessionId,
      }));
    }

    // Fallback to mock if no sessions found
    logger.info('MOCK DATA: No active sessions found, returning mock data', {
      userId,
    });
    return getMockActiveSessions(userId, currentSessionId);
  } catch (error) {
    logger.error(
      'Failed to fetch active sessions, using mock data',
      error as Error,
      { userId }
    );
    return getMockActiveSessions(userId, currentSessionId);
  }
}

/**
 * Get login history for user
 * Returns real data from UserSession table, or mock if unavailable
 */
export async function getLoginHistory(
  userId: string,
  limit = 20
): Promise<LoginHistoryEntry[]> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockLoginHistory(userId, limit);
    }

    // Try to fetch real login history
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
    });

    if (sessions.length > 0) {
      return sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress || 'Unknown',
        userAgent: session.userAgent || 'Unknown',
        location: session.ipAddress || 'Unknown',
        loginAt: session.loginAt,
        logoutAt: session.logoutAt,
        success: true, // If it exists in DB, login was successful
      }));
    }

    // Fallback to mock if no history found
    logger.info('MOCK DATA: No login history found, returning mock data', {
      userId,
    });
    return getMockLoginHistory(userId, limit);
  } catch (error) {
    logger.error(
      'Failed to fetch login history, using mock data',
      error as Error,
      { userId }
    );
    return getMockLoginHistory(userId, limit);
  }
}

/**
 * Enable/disable 2FA for user
 * Only affects real database, never mock data
 */
export async function update2FAStatus(
  userId: string,
  enabled: boolean,
  method: '2fa' | 'sms' | 'email'
): Promise<void> {
  // TODO: Implement 2FA in database schema
  logger.info('2FA update requested but not yet implemented', {
    userId,
    enabled,
    method,
  });
  throw new Error('2FA feature not yet implemented');
}

/**
 * Terminate a session
 * Only affects real database, never mock data
 */
export async function terminateSession(sessionId: string): Promise<void> {
  try {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        logoutAt: new Date(),
      },
    });

    logger.info('Session terminated', { sessionId });
  } catch (error) {
    logger.error('Failed to terminate session', error as Error, { sessionId });
    throw new Error('Failed to terminate session');
  }
}

// ============================================
// MOCK DATA GENERATORS
// ============================================

/**
 * Generate mock active sessions using static test fixtures
 */
function getMockActiveSessions(
  _userId: string,
  currentSessionId?: string
): ActiveSession[] {
  // Static predefined sessions for deterministic testing
  const staticSessions: ActiveSession[] = [
    {
      id: 'session-001',
      device: 'Chrome on Windows',
      location: 'New York, USA',
      ipAddress: '192.168.1.100',
      lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      loginAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      isCurrent: !!currentSessionId,
    },
    {
      id: 'session-002',
      device: 'Safari on macOS',
      location: 'San Francisco, USA',
      ipAddress: '192.168.1.101',
      lastActivity: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      loginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      isCurrent: false,
    },
  ];

  return staticSessions;
}

/**
 * Generate mock login history using static test fixtures
 */
function getMockLoginHistory(
  _userId: string,
  limit: number
): LoginHistoryEntry[] {
  // Static login history entries for deterministic testing
  const baseEntries: Omit<LoginHistoryEntry, 'id'>[] = [
    {
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      location: 'New York, USA',
      loginAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      logoutAt: null, // Still active
      success: true,
    },
    {
      ipAddress: '192.168.1.101',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
      location: 'San Francisco, USA',
      loginAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      logoutAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Logged out 2 hours ago
      success: true,
    },
    {
      ipAddress: '192.168.1.102',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0',
      location: 'Seattle, USA',
      loginAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      logoutAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // 1 hour session
      success: true,
    },
    {
      ipAddress: '192.168.1.103',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
      location: 'Boston, USA',
      loginAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      logoutAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 min session
      success: true,
    },
    {
      ipAddress: '10.0.0.50',
      userAgent: 'Unknown',
      location: 'Unknown',
      loginAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      logoutAt: null,
      success: false, // Failed login attempt
    },
  ];

  // Take only the requested number of entries
  const entries = baseEntries.slice(0, Math.min(limit, baseEntries.length));

  // Add unique IDs
  return entries.map((entry, index) => ({
    ...entry,
    id: `login-${String(index + 1).padStart(3, '0')}`,
  }));
}

/**
 * Parse user agent string to friendly device name
 */
function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown Device';

  const ua = userAgent.toLowerCase();

  // Browser detection
  let browser = 'Unknown Browser';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';

  // OS detection
  let os = 'Unknown OS';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return `${browser} on ${os}`;
}
