import { authPost, authGet, authFetch } from '../../../utils/api';
import type {
  GlobalChatScope,
  GlobalChatSession,
  GlobalChatSessionWithMessages,
} from '../types';

const BASE = '/api/global-chat';

export async function createSession(
  scope: GlobalChatScope = 'general'
): Promise<GlobalChatSession> {
  const res = await authPost(`${BASE}/sessions`, { scope });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Failed to create session (${res.status})`);
  }
  return res.json();
}

export async function listSessions(
  limit = 20,
  offset = 0
): Promise<{ sessions: GlobalChatSession[]; total: number }> {
  const res = await authGet(`${BASE}/sessions?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    throw new Error(`Failed to list sessions (${res.status})`);
  }
  return res.json();
}

export async function getSession(
  id: string
): Promise<GlobalChatSessionWithMessages> {
  const res = await authGet(`${BASE}/sessions/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to get session (${res.status})`);
  }
  return res.json();
}

export async function escalateSession(
  id: string
): Promise<{ ticketId: string; feedbackId: string }> {
  const res = await authPost(`${BASE}/sessions/${id}/escalate`, {});
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Failed to escalate (${res.status})`);
  }
  return res.json();
}

export async function archiveSession(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/sessions/${id}/archive`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    throw new Error(`Failed to archive session (${res.status})`);
  }
}
