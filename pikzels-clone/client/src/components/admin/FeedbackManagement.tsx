/**
 * FeedbackManagement - Admin panel for viewing feedback and managing tickets
 *
 * Features:
 * - Tabbed view: All Feedback | Open Tickets
 * - Feedback list with filters (type, priority, sentiment)
 * - Ticket list with status filters
 * - Ticket detail with reply functionality
 * - Status update controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Bug,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  Send,
  RefreshCw,
  Ticket,
} from 'lucide-react';
import {
  adminFeedbackService,
  type AdminFeedbackRecord,
  type AdminTicketRecord,
  type PaginatedResult,
} from '../../services/admin/adminFeedbackService';

type Tab = 'feedback' | 'tickets';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  LOW: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  WAITING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  RESOLVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  CLOSED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const SENTIMENT_ICONS: Record<string, string> = {
  POSITIVE: '😊',
  NEGATIVE: '😞',
  NEUTRAL: '😐',
  MIXED: '🤔',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BUG: <Bug className="w-4 h-4" />,
  FEATURE_REQUEST: <Star className="w-4 h-4" />,
  GENERAL: <MessageSquare className="w-4 h-4" />,
};

const FeedbackManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('feedback');
  const [feedbackData, setFeedbackData] = useState<PaginatedResult<AdminFeedbackRecord> | null>(null);
  const [ticketData, setTicketData] = useState<PaginatedResult<AdminTicketRecord> | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [ticketPage, setTicketPage] = useState(1);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Reply form
  const [replyMessage, setReplyMessage] = useState('');
  const [replyInternal, setReplyInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminFeedbackService.listFeedback({
        page: feedbackPage,
        pageSize: 20,
        ...(priorityFilter && { priority: priorityFilter }),
        ...(typeFilter && { type: typeFilter }),
      });
      setFeedbackData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [feedbackPage, priorityFilter, typeFilter]);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminFeedbackService.listTickets({
        page: ticketPage,
        pageSize: 20,
        ...(statusFilter && { status: statusFilter }),
      });
      setTicketData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [ticketPage, statusFilter]);

  useEffect(() => {
    if (activeTab === 'feedback') loadFeedback();
    else loadTickets();
  }, [activeTab, loadFeedback, loadTickets]);

  const handleViewTicket = async (ticketId: string) => {
    try {
      const ticket = await adminFeedbackService.getTicket(ticketId);
      setSelectedTicket(ticket);
    } catch {
      setError('Failed to load ticket details');
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: string) => {
    try {
      await adminFeedbackService.updateTicket(ticketId, { status });
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket((prev) => prev ? { ...prev, status } : null);
      }
      loadTickets();
    } catch {
      setError('Failed to update ticket status');
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setSubmittingReply(true);
    try {
      await adminFeedbackService.addReply(selectedTicket.id, replyMessage.trim(), replyInternal);
      setReplyMessage('');
      setReplyInternal(false);
      // Reload ticket to show new reply
      const updated = await adminFeedbackService.getTicket(selectedTicket.id);
      setSelectedTicket(updated);
    } catch {
      setError('Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCreateTicket = async (feedbackId: string) => {
    try {
      await adminFeedbackService.createTicket(feedbackId);
      loadFeedback();
    } catch {
      setError('Failed to create ticket');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Feedback & Support</h1>
          <p className="text-slate-400 mt-1">Manage user feedback and support tickets</p>
        </div>
        <button
          onClick={() => activeTab === 'feedback' ? loadFeedback() : loadTickets()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => { setActiveTab('feedback'); setSelectedTicket(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'feedback'
              ? 'bg-[#2563ff] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          All Feedback
          {feedbackData && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/10">
              {feedbackData.total}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('tickets'); setSelectedTicket(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'tickets'
              ? 'bg-[#2563ff] text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          Tickets
          {ticketData && (
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-white/10">
              {ticketData.total}
            </span>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List panel */}
        <div className={selectedTicket ? 'lg:col-span-1' : 'lg:col-span-3'}>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Filter className="w-4 h-4 text-slate-500 mt-2" />
            {activeTab === 'feedback' ? (
              <>
                <select
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setFeedbackPage(1); }}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
                >
                  <option value="">All Types</option>
                  <option value="BUG">Bug</option>
                  <option value="FEATURE_REQUEST">Feature Request</option>
                  <option value="GENERAL">General</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => { setPriorityFilter(e.target.value); setFeedbackPage(1); }}
                  className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
                >
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </>
            ) : (
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setTicketPage(1); }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING">Waiting</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            )}
          </div>

          {/* List */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : activeTab === 'feedback' ? (
              feedbackData?.data.length ? (
                feedbackData.data.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-slate-300">
                        {TYPE_ICONS[fb.type] || <MessageSquare className="w-4 h-4" />}
                        <span className="font-medium text-slate-100 text-sm">
                          {fb.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {fb.sentiment && (
                          <span title={fb.sentiment}>{SENTIMENT_ICONS[fb.sentiment] || ''}</span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${PRIORITY_COLORS[fb.priority] || ''}`}>
                          {fb.priority}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                      {fb.aiSummary || fb.message}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{formatDate(fb.createdAt)}</span>
                      <div className="flex gap-2">
                        {fb.Ticket ? (
                          <button
                            onClick={() => handleViewTicket(fb.Ticket!.id)}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            View Ticket ({fb.Ticket.status})
                          </button>
                        ) : (
                          <button
                            onClick={() => handleCreateTicket(fb.id)}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            Create Ticket
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500">No feedback found</div>
              )
            ) : ticketData?.data.length ? (
              ticketData.data.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => handleViewTicket(ticket.id)}
                  className={`w-full text-left p-4 bg-slate-900/50 border rounded-xl hover:border-slate-600 transition-colors ${
                    selectedTicket?.id === ticket.id ? 'border-indigo-500/50' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-100">
                      {ticket.Feedback?.subject || `Ticket ${ticket.id.slice(0, 8)}`}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[ticket.status] || ''}`}>
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{formatDate(ticket.createdAt)}</span>
                    {ticket.assignee && <span>Assigned: {ticket.assignee}</span>}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-slate-500">No tickets found</div>
            )}
          </div>

          {/* Pagination */}
          {(activeTab === 'feedback' ? feedbackData : ticketData) && (
            <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
              <span>
                Page {activeTab === 'feedback' ? feedbackData?.page : ticketData?.page} of{' '}
                {activeTab === 'feedback' ? feedbackData?.totalPages : ticketData?.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={(activeTab === 'feedback' ? feedbackPage : ticketPage) <= 1}
                  onClick={() =>
                    activeTab === 'feedback'
                      ? setFeedbackPage((p) => p - 1)
                      : setTicketPage((p) => p - 1)
                  }
                  className="px-3 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={
                    activeTab === 'feedback'
                      ? feedbackPage >= (feedbackData?.totalPages || 1)
                      : ticketPage >= (ticketData?.totalPages || 1)
                  }
                  onClick={() =>
                    activeTab === 'feedback'
                      ? setFeedbackPage((p) => p + 1)
                      : setTicketPage((p) => p + 1)
                  }
                  className="px-3 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ticket Detail Panel */}
        {selectedTicket && (
          <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            {/* Ticket Header */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-100">
                  {selectedTicket.Feedback?.subject || `Ticket ${selectedTicket.id.slice(0, 8)}`}
                </h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-200 text-sm"
                >
                  Close
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUS_COLORS[selectedTicket.status] || ''}`}>
                  {selectedTicket.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-500">
                  Created {formatDate(selectedTicket.createdAt)}
                </span>
              </div>
            </div>

            {/* Status Actions */}
            <div className="p-4 border-b border-slate-800 flex gap-2 flex-wrap">
              {['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'].map((status) => (
                <button
                  key={status}
                  disabled={selectedTicket.status === status}
                  onClick={() => handleUpdateStatus(selectedTicket.id, status)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                    selectedTicket.status === status
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {status.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Replies */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {selectedTicket.Replies?.length ? (
                selectedTicket.Replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-3 rounded-lg ${
                      reply.isInternal
                        ? 'bg-yellow-500/5 border border-yellow-500/20'
                        : 'bg-slate-800/50 border border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-300">{reply.authorName}</span>
                      <div className="flex items-center gap-2">
                        {reply.isInternal && (
                          <span className="text-yellow-400 text-xs">Internal</span>
                        )}
                        <span>{formatDate(reply.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-200">{reply.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No replies yet
                </div>
              )}
            </div>

            {/* Reply Form */}
            <div className="p-4 border-t border-slate-800">
              <div className="flex gap-2">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 resize-none focus:border-indigo-500 outline-none"
                  rows={2}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyMessage.trim() || submittingReply}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-40 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replyInternal}
                      onChange={(e) => setReplyInternal(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    Internal
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackManagement;
