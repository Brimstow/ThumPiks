/**
 * NotificationConfigAdmin — Admin page for managing notification routing.
 *
 * Allows admins to configure which channels (admin panel, email) receive
 * notifications for each event type, and which email addresses get notified.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Monitor,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  adminNotificationConfigService,
  type NotificationConfigRecord,
  type NotificationChannel,
  type UpsertConfigPayload,
} from '../../services/admin/adminNotificationConfigService';
import Tooltip from '../ui/Tooltip';

// ── Known event keys with human-readable labels ──

interface EventKeyMeta {
  label: string;
  description: string;
}

const EVENT_KEY_META: Record<string, EventKeyMeta> = {
  'feedback.submitted': {
    label: 'Feedback Submitted',
    description: 'When a user submits feedback via the widget or chatbot',
  },
  'feedback.urgent': {
    label: 'Urgent Feedback',
    description: 'When AI flags feedback as high-priority or critical',
  },
  'ticket.created': {
    label: 'Ticket Created',
    description: 'When a new support ticket is created',
  },
  'ticket.updated': {
    label: 'Ticket Updated',
    description: 'When a ticket status changes or receives a reply',
  },
  'ticket.escalated': {
    label: 'Ticket Escalated',
    description: 'When a chatbot conversation escalates to a ticket',
  },
  'contact.submitted': {
    label: 'Contact Form Submitted',
    description: 'When someone submits the public contact form',
  },
  'digest.weekly': {
    label: 'Weekly Digest',
    description: 'Scheduled weekly summary of feedback and tickets',
  },
};

const ALL_CHANNELS: { id: NotificationChannel; label: string; icon: React.ReactNode }[] = [
  { id: 'admin_panel', label: 'Admin Panel', icon: <Monitor size={14} /> },
  { id: 'email', label: 'Email', icon: <Mail size={14} /> },
];

// ── Component ──

const NotificationConfigAdmin: React.FC = () => {
  const [configs, setConfigs] = useState<NotificationConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEventKey, setNewEventKey] = useState('');

  // Editable drafts: key -> partial payload
  const [drafts, setDrafts] = useState<Record<string, UpsertConfigPayload>>({});

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminNotificationConfigService.listAll();
      setConfigs(result);
      // Initialize drafts from server data
      const newDrafts: Record<string, UpsertConfigPayload> = {};
      for (const c of result) {
        newDrafts[c.key] = {
          key: c.key,
          channels: [...c.channels],
          emails: [...c.emails],
          enabled: c.enabled,
        };
      }
      setDrafts(newDrafts);
    } catch {
      setError('Failed to load notification configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // Auto-dismiss success message
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);

  const getDraft = (key: string): UpsertConfigPayload => {
    return drafts[key] || { key, channels: ['admin_panel'], emails: [], enabled: true };
  };

  const updateDraft = (key: string, updates: Partial<UpsertConfigPayload>) => {
    setDrafts(prev => ({
      ...prev,
      [key]: { ...getDraft(key), ...updates },
    }));
  };

  const toggleChannel = (key: string, channel: NotificationChannel) => {
    const draft = getDraft(key);
    const has = draft.channels.includes(channel);
    const newChannels = has
      ? draft.channels.filter(c => c !== channel)
      : [...draft.channels, channel];
    updateDraft(key, { channels: newChannels });
  };

  const addEmail = (key: string, email: string) => {
    const draft = getDraft(key);
    if (!email || draft.emails.includes(email)) return;
    updateDraft(key, { emails: [...draft.emails, email] });
  };

  const removeEmail = (key: string, email: string) => {
    const draft = getDraft(key);
    updateDraft(key, { emails: draft.emails.filter(e => e !== email) });
  };

  const handleSave = async (key: string) => {
    const draft = getDraft(key);

    // Validate
    if (draft.channels.length === 0) {
      setError('Select at least one channel');
      return;
    }
    if (draft.channels.includes('email') && draft.emails.length === 0) {
      setError('Add at least one email address when email channel is enabled');
      return;
    }

    setSaving(key);
    setError(null);
    try {
      const updated = await adminNotificationConfigService.upsert(draft);
      setConfigs(prev => {
        const idx = prev.findIndex(c => c.key === key);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [...prev, updated];
      });
      setSuccess(`Saved "${meta(key).label}"`);
      setShowAddForm(false);
    } catch {
      setError(`Failed to save config for "${key}"`);
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    setSaving(key);
    try {
      const updated = await adminNotificationConfigService.toggleEnabled(key, enabled);
      setConfigs(prev => prev.map(c => (c.key === key ? updated : c)));
      updateDraft(key, { enabled });
    } catch {
      setError(`Failed to toggle "${key}"`);
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete notification config for "${meta(key).label}"?`)) return;
    setSaving(key);
    try {
      await adminNotificationConfigService.deleteConfig(key);
      setConfigs(prev => prev.filter(c => c.key !== key));
      setDrafts(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (expandedKey === key) setExpandedKey(null);
      setSuccess(`Deleted "${meta(key).label}"`);
    } catch {
      setError(`Failed to delete config for "${key}"`);
    } finally {
      setSaving(null);
    }
  };

  const handleAddNew = () => {
    if (!newEventKey) return;
    if (configs.some(c => c.key === newEventKey)) {
      setError('Config for this event already exists');
      return;
    }
    const draft: UpsertConfigPayload = {
      key: newEventKey,
      channels: ['admin_panel'],
      emails: [],
      enabled: true,
    };
    setDrafts(prev => ({ ...prev, [newEventKey]: draft }));
    setConfigs(prev => [
      ...prev,
      {
        id: '',
        key: newEventKey,
        channels: ['admin_panel'],
        emails: [],
        enabled: true,
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    setExpandedKey(newEventKey);
    setShowAddForm(false);
    setNewEventKey('');
  };

  const meta = (key: string): EventKeyMeta =>
    EVENT_KEY_META[key] || { label: key, description: 'Custom event' };

  const unconfiguredKeys = Object.keys(EVENT_KEY_META).filter(
    k => !configs.some(c => c.key === k)
  );

  // ── Render ──

  return (
    <div style={{ padding: '24px', maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={22} /> Notification Routing
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
            Configure which channels receive notifications for each event type
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip content="Refresh configs" side="top">
            <button
              onClick={fetchConfigs}
              disabled={loading}
              style={{
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: 8,
                background: 'transparent',
                color: '#d1d5db',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </Tooltip>
          <Tooltip content="Add new event config" side="top">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: 8,
                background: '#6366f1',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Plus size={14} /> Add Event
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Status banners */}
      {error && (
        <div style={{
          padding: '10px 14px',
          marginBottom: 16,
          borderRadius: 8,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <AlertCircle size={16} />
          {error}
          <Tooltip content="Dismiss" side="top">
            <button
              onClick={() => setError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>
      )}
      {success && (
        <div style={{
          padding: '10px 14px',
          marginBottom: 16,
          borderRadius: 8,
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          color: '#4ade80',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Add new event form */}
      {showAddForm && (
        <div style={{
          padding: 16,
          marginBottom: 16,
          borderRadius: 10,
          border: '1px solid #374151',
          background: '#1f2937',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 500, color: '#e5e7eb' }}>Add notification config for event</p>
          {unconfiguredKeys.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {unconfiguredKeys.map(key => (
                <button
                  key={key}
                  onClick={() => { setNewEventKey(key); handleAddNew(); }}
                  onMouseDown={() => setNewEventKey(key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #374151',
                    background: newEventKey === key ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: newEventKey === key ? '#a5b4fc' : '#d1d5db',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {meta(key).label}
                </button>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>
              All known events are already configured
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="text"
              value={newEventKey}
              onChange={e => setNewEventKey(e.target.value)}
              placeholder="Or enter custom event key..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #374151',
                borderRadius: 8,
                background: '#111827',
                color: '#f3f4f6',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <button
              onClick={handleAddNew}
              disabled={!newEventKey}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: 8,
                background: newEventKey ? '#6366f1' : '#374151',
                color: 'white',
                cursor: newEventKey ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
          Loading notification configs...
        </div>
      )}

      {/* Empty state */}
      {!loading && configs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 48,
          border: '1px dashed #374151',
          borderRadius: 12,
          color: '#9ca3af',
        }}>
          <Bell size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p style={{ margin: '0 0 8px', fontSize: 15, color: '#e5e7eb' }}>No notification configs yet</p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Click "Add Event" to configure notification routing for events
          </p>
        </div>
      )}

      {/* Config list */}
      {!loading && configs.map(config => {
        const m = meta(config.key);
        const isExpanded = expandedKey === config.key;
        const draft = getDraft(config.key);
        const isSaving = saving === config.key;

        return (
          <div
            key={config.key}
            style={{
              marginBottom: 8,
              borderRadius: 10,
              border: '1px solid #374151',
              background: '#111827',
              overflow: 'hidden',
            }}
          >
            {/* Row header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px 16px',
                cursor: 'pointer',
                gap: 12,
              }}
              onClick={() => setExpandedKey(isExpanded ? null : config.key)}
            >
              {isExpanded ? <ChevronDown size={16} color="#9ca3af" /> : <ChevronRight size={16} color="#9ca3af" />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#f3f4f6' }}>{m.label}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{config.key}</div>
              </div>
              {/* Channel pills */}
              <div style={{ display: 'flex', gap: 6 }}>
                {config.channels.map(ch => (
                  <span
                    key={ch}
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 9999,
                      background: 'rgba(99,102,241,0.15)',
                      color: '#818cf8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {ch === 'email' ? <Mail size={10} /> : <Monitor size={10} />}
                    {ch === 'admin_panel' ? 'Panel' : 'Email'}
                  </span>
                ))}
              </div>
              {/* Toggle switch */}
              <Tooltip content={config.enabled ? 'Disable' : 'Enable'} side="top">
                <button
                  onClick={e => { e.stopPropagation(); handleToggle(config.key, !config.enabled); }}
                  disabled={isSaving}
                  style={{
                    width: 40,
                    height: 22,
                    borderRadius: 11,
                    border: 'none',
                    background: config.enabled ? '#6366f1' : '#374151',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: config.enabled ? 20 : 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s',
                  }} />
                </button>
              </Tooltip>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{
                padding: '0 16px 16px',
                borderTop: '1px solid #1f2937',
              }}>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '12px 0 16px' }}>
                  {m.description}
                </p>

                {/* Channels */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#d1d5db', marginBottom: 8 }}>
                    Channels
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {ALL_CHANNELS.map(ch => {
                      const active = draft.channels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => toggleChannel(config.key, ch.id)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: 8,
                            border: `1px solid ${active ? '#6366f1' : '#374151'}`,
                            background: active ? 'rgba(99,102,241,0.1)' : 'transparent',
                            color: active ? '#a5b4fc' : '#9ca3af',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 13,
                          }}
                        >
                          {ch.icon} {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Email recipients (only if email channel selected) */}
                {draft.channels.includes('email') && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#d1d5db', marginBottom: 8 }}>
                      Email Recipients
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {draft.emails.map(email => (
                        <span
                          key={email}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#1f2937',
                            border: '1px solid #374151',
                            color: '#d1d5db',
                            fontSize: 13,
                          }}
                        >
                          <Mail size={12} />
                          {email}
                          <Tooltip content="Remove email" side="top">
                            <button
                              onClick={() => removeEmail(config.key, email)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'flex',
                              }}
                            >
                              <X size={12} />
                            </button>
                          </Tooltip>
                        </span>
                      ))}
                    </div>
                    <EmailInput onAdd={(email) => addEmail(config.key, email)} />
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Tooltip content="Delete this config" side="top">
                    <button
                      onClick={() => handleDelete(config.key)}
                      disabled={isSaving}
                      style={{
                        padding: '8px 14px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 8,
                        background: 'transparent',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                      }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </Tooltip>
                  <Tooltip content="Save changes" side="top">
                    <button
                      onClick={() => handleSave(config.key)}
                      disabled={isSaving}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: 8,
                        background: '#6366f1',
                        color: 'white',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 500,
                        opacity: isSaving ? 0.6 : 1,
                      }}
                    >
                      <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Inline sub-component: Email input ──

function EmailInput({ onAdd }: { onAdd: (email: string) => void }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="email"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
        placeholder="Add email address..."
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #374151',
          borderRadius: 8,
          background: '#111827',
          color: '#f3f4f6',
          fontSize: 13,
          outline: 'none',
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        style={{
          padding: '8px 14px',
          border: '1px solid #374151',
          borderRadius: 8,
          background: value.trim() ? '#1f2937' : 'transparent',
          color: value.trim() ? '#d1d5db' : '#6b7280',
          cursor: value.trim() ? 'pointer' : 'not-allowed',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Plus size={14} /> Add
      </button>
    </div>
  );
}

export default NotificationConfigAdmin;
