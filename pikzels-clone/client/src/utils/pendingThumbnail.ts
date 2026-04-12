/**
 * Pending Thumbnail Storage Utility
 * 
 * Manages localStorage persistence for thumbnails generated on the landing page
 * with 24-hour TTL (time-to-live) expiration.
 * 
 * Security notes:
 * - Only stores thumbnail URLs and metadata — never auth tokens or credits
 * - 24h TTL prevents stale data accumulation
 * - Duplicate-submission guard prevents double-charging on rapid re-clicks
 */

const STORAGE_KEY = 'pendingThumbnail';
const INFLIGHT_KEY = 'pendingThumbnailInflight';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INFLIGHT_TTL_MS = 30 * 1000;   // 30 seconds — clears if tab crashes mid-request

export interface PendingThumbnail {
  thumbnailUrl: string;
  thumbnailId?: string;
  videoTitle?: string;
  videoUrl?: string;
  creditCost: number;
  createdAt: number; // timestamp
}

/**
 * Save a pending thumbnail to localStorage
 */
export function savePendingThumbnail(thumbnail: Omit<PendingThumbnail, 'createdAt'>): void {
  try {
    const data: PendingThumbnail = {
      ...thumbnail,
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save pending thumbnail:', error);
  }
}

/**
 * Get pending thumbnail from localStorage
 * Returns null if expired or not found
 */
export function getPendingThumbnail(): PendingThumbnail | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: PendingThumbnail = JSON.parse(stored);
    
    // Check if expired
    const age = Date.now() - data.createdAt;
    if (age > TTL_MS) {
      // Expired - clean up
      clearPendingThumbnail();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get pending thumbnail:', error);
    return null;
  }
}

/**
 * Check if there's a valid pending thumbnail
 */
export function hasPendingThumbnail(): boolean {
  return getPendingThumbnail() !== null;
}

/**
 * Clear pending thumbnail from localStorage
 */
export function clearPendingThumbnail(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear pending thumbnail:', error);
  }
}

/**
 * Get time remaining before expiration (in milliseconds)
 */
export function getPendingThumbnailTTL(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;

    const data: PendingThumbnail = JSON.parse(stored);
    const age = Date.now() - data.createdAt;
    const remaining = TTL_MS - age;
    
    return Math.max(0, remaining);
  } catch (error) {
    return 0;
  }
}

/**
 * Format TTL as human-readable string
 */
export function formatPendingThumbnailTTL(): string {
  const ttl = getPendingThumbnailTTL();
  if (ttl <= 0) return 'Expired';

  const hours = Math.floor(ttl / (60 * 60 * 1000));
  const minutes = Math.floor((ttl % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}

// ============================================
// DUPLICATE SUBMISSION GUARD
// Prevents double-charging when users rapid-click "Generate"
// ============================================

/**
 * Mark a generation as in-flight (started, not yet resolved).
 * Returns false if a generation is already in progress — caller should abort.
 */
export function markGenerationInflight(): boolean {
  try {
    const existing = localStorage.getItem(INFLIGHT_KEY);
    if (existing) {
      const { startedAt } = JSON.parse(existing);
      // Allow if the in-flight marker is stale (tab crash / network hang)
      if (Date.now() - startedAt < INFLIGHT_TTL_MS) {
        return false; // Already in progress
      }
    }
    localStorage.setItem(INFLIGHT_KEY, JSON.stringify({ startedAt: Date.now() }));
    return true;
  } catch {
    return true; // Fail open — don't block generation if localStorage errors
  }
}

/**
 * Clear the in-flight marker after generation resolves (success or failure).
 */
export function clearGenerationInflight(): void {
  try {
    localStorage.removeItem(INFLIGHT_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Check if a generation is currently in progress.
 */
export function isGenerationInflight(): boolean {
  try {
    const existing = localStorage.getItem(INFLIGHT_KEY);
    if (!existing) return false;
    const { startedAt } = JSON.parse(existing);
    return Date.now() - startedAt < INFLIGHT_TTL_MS;
  } catch {
    return false;
  }
}
