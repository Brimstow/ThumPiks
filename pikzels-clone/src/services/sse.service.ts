/**
 * SSE (Server-Sent Events) Service
 *
 * WHAT: Manages long-lived SSE connections for real-time notification push
 * WHY: Enables instant notification delivery without polling
 * HOW: Maintains per-user and admin connection maps, sends invalidation signals
 *
 * Security:
 * - Per-IP connection limit (5) prevents DoS
 * - Per-user connection limit (3) covers multi-tab
 * - Max connection duration (30 min) forces periodic re-auth
 * - Heartbeat every 30s keeps connections alive and detects dead clients
 * - SSE field sanitization prevents injection (CVE-2026-33128)
 * - retry field controls client reconnection timing
 *
 * Alignment:
 * - Service Factory: registered as 'sse' in factory
 * - Singleton pattern via getInstance()
 */

import { Response, Request } from 'express';
import { logger } from '../utils/logger';

const MAX_CONNECTIONS_PER_IP = 5;
const MAX_CONNECTIONS_PER_USER = 3;
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_CONNECTION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const SSE_RETRY_MS = 5000;

interface SSEConnection {
  res: Response;
  userId?: string | undefined;
  ip: string;
  connectedAt: number;
  heartbeatTimer: ReturnType<typeof setInterval>;
  maxDurationTimer: ReturnType<typeof setTimeout>;
}

export class SSEService {
  private static instance: SSEService;
  private userConnections = new Map<string, Set<SSEConnection>>();
  private adminConnections = new Set<SSEConnection>();
  private connectionsByIP = new Map<string, number>();

  private constructor() {}

  static getInstance(): SSEService {
    if (!SSEService.instance) {
      SSEService.instance = new SSEService();
    }
    return SSEService.instance;
  }

  /**
   * Register a user SSE connection. Sets headers, starts heartbeat,
   * enforces connection limits, and schedules max-duration disconnect.
   */
  registerUserConnection(userId: string, ip: string, req: Request, res: Response): boolean {
    // Check per-IP limit
    const ipCount = this.connectionsByIP.get(ip) || 0;
    if (ipCount >= MAX_CONNECTIONS_PER_IP) {
      res.status(429).json({ error: 'Too many SSE connections from this IP' });
      return false;
    }

    // Check per-user limit
    const userConns = this.userConnections.get(userId);
    if (userConns && userConns.size >= MAX_CONNECTIONS_PER_USER) {
      res.status(429).json({ error: 'Too many SSE connections for this user' });
      return false;
    }

    this.setupSSEResponse(res);

    const conn = this.createConnection(res, ip, userId);

    // Add to user map
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(conn);
    this.connectionsByIP.set(ip, ipCount + 1);

    // Cleanup on disconnect
    req.on('close', () => {
      this.removeUserConnection(userId, conn);
    });

    logger.info('SSE user connection opened', { userId, ip });
    return true;
  }

  /**
   * Register an admin SSE connection.
   */
  registerAdminConnection(ip: string, req: Request, res: Response): boolean {
    const ipCount = this.connectionsByIP.get(ip) || 0;
    if (ipCount >= MAX_CONNECTIONS_PER_IP) {
      res.status(429).json({ error: 'Too many SSE connections from this IP' });
      return false;
    }

    this.setupSSEResponse(res);

    const conn = this.createConnection(res, ip);
    this.adminConnections.add(conn);
    this.connectionsByIP.set(ip, ipCount + 1);

    req.on('close', () => {
      this.removeAdminConnection(conn);
    });

    logger.info('SSE admin connection opened', { ip });
    return true;
  }

  /**
   * Send invalidation signal to all connections for a specific user.
   * The frontend receives this and uses TanStack Query to refetch.
   */
  invalidateUser(userId: string): void {
    const conns = this.userConnections.get(userId);
    if (!conns || conns.size === 0) return;

    const deadConns: SSEConnection[] = [];
    for (const conn of conns) {
      if (!this.sendSSE(conn.res, 'invalidate', { tags: ['notifications'] })) {
        deadConns.push(conn);
      }
    }

    // Prune dead connections
    for (const conn of deadConns) {
      this.removeUserConnection(userId, conn);
    }
  }

  /**
   * Send invalidation signal to all admin connections.
   */
  invalidateAdmins(): void {
    const deadConns: SSEConnection[] = [];
    for (const conn of this.adminConnections) {
      if (!this.sendSSE(conn.res, 'invalidate', { tags: ['notifications'] })) {
        deadConns.push(conn);
      }
    }

    for (const conn of deadConns) {
      this.removeAdminConnection(conn);
    }
  }

  /** Get connection statistics for health monitoring. */
  getStats(): { userConnections: number; adminConnections: number; uniqueUsers: number } {
    let totalUserConns = 0;
    for (const conns of this.userConnections.values()) {
      totalUserConns += conns.size;
    }
    return {
      userConnections: totalUserConns,
      adminConnections: this.adminConnections.size,
      uniqueUsers: this.userConnections.size,
    };
  }

  /** Graceful shutdown — close all connections. */
  shutdown(): void {
    for (const [, conns] of this.userConnections) {
      for (const conn of conns) {
        this.cleanupConnection(conn);
        try { conn.res.end(); } catch {}
      }
      conns.clear();
    }
    this.userConnections.clear();

    for (const conn of this.adminConnections) {
      this.cleanupConnection(conn);
      try { conn.res.end(); } catch {}
    }
    this.adminConnections.clear();
    this.connectionsByIP.clear();

    logger.info('SSE service shut down');
  }

  // ---- Private Helpers ----

  private setupSSEResponse(res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    // Set retry interval for client reconnection
    res.write(`retry: ${SSE_RETRY_MS}\n\n`);
  }

  private createConnection(res: Response, ip: string, userId?: string): SSEConnection {
    // Heartbeat timer — keeps connection alive and detects dead clients
    const heartbeatTimer = setInterval(() => {
      try {
        res.write(':heartbeat\n\n');
      } catch {
        // Connection is dead, cleanup will happen via req.on('close')
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Max duration timer — force reconnect after 30 minutes
    const maxDurationTimer = setTimeout(() => {
      try {
        this.sendSSE(res, 'reconnect', { reason: 'max_duration' });
        res.end();
      } catch {
        // Already closed
      }
    }, MAX_CONNECTION_DURATION_MS);

    return {
      res,
      userId,
      ip,
      connectedAt: Date.now(),
      heartbeatTimer,
      maxDurationTimer,
    };
  }

  /**
   * Safely write an SSE event. Returns false if the write failed (dead connection).
   * Sanitizes event name to prevent SSE injection (CVE-2026-33128).
   */
  private sendSSE(res: Response, event: string, data: unknown, id?: string): boolean {
    try {
      if (id) {
        res.write(`id: ${this.sanitizeSSEField(id)}\n`);
      }
      res.write(`event: ${this.sanitizeSSEField(event)}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch {
      return false;
    }
  }

  /** Strip newlines from SSE fields to prevent injection. */
  private sanitizeSSEField(value: string): string {
    return value.replace(/[\r\n]/g, '');
  }

  private removeUserConnection(userId: string, conn: SSEConnection): void {
    const conns = this.userConnections.get(userId);
    if (conns) {
      conns.delete(conn);
      if (conns.size === 0) {
        this.userConnections.delete(userId);
      }
    }
    this.cleanupConnection(conn);
    this.decrementIP(conn.ip);
  }

  private removeAdminConnection(conn: SSEConnection): void {
    this.adminConnections.delete(conn);
    this.cleanupConnection(conn);
    this.decrementIP(conn.ip);
  }

  private cleanupConnection(conn: SSEConnection): void {
    clearInterval(conn.heartbeatTimer);
    clearTimeout(conn.maxDurationTimer);
  }

  private decrementIP(ip: string): void {
    const count = this.connectionsByIP.get(ip) || 0;
    if (count <= 1) {
      this.connectionsByIP.delete(ip);
    } else {
      this.connectionsByIP.set(ip, count - 1);
    }
  }
}
