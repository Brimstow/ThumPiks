import React, { useState, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Clock,
  Link2,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import Tooltip from '../../ui/Tooltip';
import {
  getUrlHistory,
  deleteUrlHistoryEntry,
  clearAllUrlHistory,
  togglePinUrl,
  bulkDeleteUrls,
  UrlHistoryEntry,
} from '../../../services/quickEditService';
import { EXAMPLE_VIDEO_URL, EXAMPLE_VIDEO_LABEL } from './constants';

interface QuickEditUrlInputProps {
  urlInput: string;
  setUrlInput: (url: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onBack: () => void;
}

const RECENT_COLLAPSED_COUNT = 5;

const QuickEditUrlInput: React.FC<QuickEditUrlInputProps> = ({
  urlInput,
  setUrlInput,
  loading,
  onSubmit,
  onBack,
}) => {
  // Internal URL history state
  const [urlHistory, setUrlHistory] = useState<UrlHistoryEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clipboardStatus, setClipboardStatus] = useState<
    'idle' | 'pasting' | 'pasted' | 'error'
  >('idle');

  // Load URL history on mount
  const loadUrlHistory = useCallback(async () => {
    try {
      const history = await getUrlHistory(50);
      setUrlHistory(history);
    } catch {
      // Silent fail — history is nice-to-have
    }
  }, []);

  useEffect(() => {
    loadUrlHistory();
  }, [loadUrlHistory]);

  // Handlers
  const handleDeleteUrlEntry = useCallback(async (id: string) => {
    try {
      await deleteUrlHistoryEntry(id);
      setUrlHistory(prev => prev.filter(h => h.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch { /* Silent fail */ }
  }, []);

  const handleTogglePin = useCallback(async (id: string) => {
    try {
      const updated = await togglePinUrl(id);
      setUrlHistory(prev =>
        prev
          .map(h => (h.id === id ? { ...h, pinned: updated.pinned } : h))
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );
    } catch { /* Silent fail */ }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      await bulkDeleteUrls(Array.from(selectedIds));
      setUrlHistory(prev => prev.filter(h => !selectedIds.has(h.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch { /* Silent fail */ }
  }, [selectedIds]);

  const handleClearAllHistory = useCallback(async () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      setTimeout(() => setConfirmClearAll(false), 3000);
      return;
    }
    try {
      await clearAllUrlHistory(false);
      setUrlHistory(prev => prev.filter(h => h.pinned));
      setConfirmClearAll(false);
      setSelectedIds(new Set());
      setSelectMode(false);
    } catch { /* Silent fail */ }
  }, [confirmClearAll]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setClipboardStatus('pasting');
      const text = await navigator.clipboard.readText();
      const trimmed = text?.trim() ?? '';
      if (trimmed && (trimmed.startsWith('http') || trimmed.startsWith('www.'))) {
        setUrlInput(trimmed);
        setClipboardStatus('pasted');
      } else {
        setClipboardStatus('error');
      }
      setTimeout(() => setClipboardStatus('idle'), 2000);
    } catch {
      setClipboardStatus('error');
      setTimeout(() => setClipboardStatus('idle'), 2000);
    }
  }, [setUrlInput]);

  const handleTryExample = useCallback(() => {
    setUrlInput(EXAMPLE_VIDEO_URL);
  }, [setUrlInput]);

  // Derived state
  const pinnedEntries = urlHistory.filter(h => h.pinned);
  const recentEntries = urlHistory.filter(h => !h.pinned);

  const filteredPinned = searchFilter
    ? pinnedEntries.filter(h =>
        h.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (h.title && h.title.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : pinnedEntries;

  const filteredRecent = searchFilter
    ? recentEntries.filter(h =>
        h.url.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (h.title && h.title.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : recentEntries;

  const visibleRecent = showAllRecent
    ? filteredRecent
    : filteredRecent.slice(0, RECENT_COLLAPSED_COUNT);
  const hiddenRecentCount = filteredRecent.length - RECENT_COLLAPSED_COUNT;
  const allVisibleIds = [...filteredPinned, ...filteredRecent].map(h => h.id);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every(id => selectedIds.has(id));

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  }, [allSelected, allVisibleIds]);

  // Shared row renderer
  const renderHistoryRow = (entry: UrlHistoryEntry, isPinned: boolean) => (
    <div
      key={entry.id}
      className={`w-full text-left px-3 py-2.5 rounded-xl bg-gray-800/50
                 border transition-colors group flex items-center gap-2 ${
                   selectedIds.has(entry.id)
                     ? 'border-purple-500/50 bg-purple-900/10'
                     : isPinned
                       ? 'border-amber-600/20 hover:border-amber-500/30'
                       : 'border-gray-700/30 hover:border-gray-600'
                 }`}
    >
      {selectMode && (
        <button
          onClick={() => handleToggleSelect(entry.id)}
          className="flex-shrink-0 text-gray-500 hover:text-purple-400 transition-colors"
          title="Toggle selection"
          aria-label="Toggle selection"
        >
          {selectedIds.has(entry.id) ? (
            <CheckSquare className="w-4 h-4 text-purple-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      )}
      <button
        onClick={() => setUrlInput(entry.url)}
        className="flex-1 min-w-0 flex items-center gap-2.5 text-left"
        title="Use this URL"
        aria-label="Use this URL"
      >
        <Link2 className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-gray-300 truncate text-sm">{entry.url}</p>
          {entry.title && (
            <p className="text-gray-500 text-xs truncate">{entry.title}</p>
          )}
        </div>
        {entry.platform && (
          <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-0.5 rounded flex-shrink-0">
            {entry.platform}
          </span>
        )}
      </button>
      <button
        onClick={() => handleTogglePin(entry.id)}
        className={`p-1 rounded-lg transition-all flex-shrink-0 ${
          isPinned
            ? 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10'
            : 'text-gray-600 hover:text-amber-400 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100'
        }`}
        title={isPinned ? 'Unpin URL' : 'Save this URL'}
      >
        <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
      </button>
      <button
        onClick={() => handleDeleteUrlEntry(entry.id)}
        className="p-1 rounded-lg text-gray-600 hover:text-red-400
                   hover:bg-red-500/10 opacity-0 group-hover:opacity-100
                   transition-all flex-shrink-0"
        title="Remove from history"
        aria-label="Remove from history"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white mb-2">Paste a video link</h2>
      <p className="text-gray-400 mb-6">We'll grab the best frames for you.</p>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit()}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-4 py-3 pr-10 rounded-xl bg-gray-800 border border-gray-700
                       text-white placeholder-gray-500 focus:outline-none focus:border-purple-500
                       transition-colors text-sm sm:text-base"
            autoFocus
          />
          {urlInput && (
            <button
              onClick={() => setUrlInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              aria-label="Clear URL"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={onSubmit}
          disabled={loading || !urlInput.trim()}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500
                     text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          Go
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
        <button
          onClick={handlePasteFromClipboard}
          disabled={clipboardStatus === 'pasting'}
          type="button"
          className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all flex-1
            ${
              clipboardStatus === 'pasted'
                ? 'bg-green-500/15 border-green-500/40 text-green-400'
                : clipboardStatus === 'error'
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-gray-800/60 border-gray-700/50 text-gray-300 hover:border-purple-500/40 hover:text-white'
            }`}
        >
          <Clipboard className="w-4 h-4 flex-shrink-0" />
          {clipboardStatus === 'pasting'
            ? 'Reading...'
            : clipboardStatus === 'pasted'
              ? '\u2713 Link pasted!'
              : clipboardStatus === 'error'
                ? 'Nothing to paste'
                : 'Paste from Clipboard'}
        </button>
        <button
          onClick={handleTryExample}
          type="button"
          title={`Try with: ${EXAMPLE_VIDEO_LABEL}`}
          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-gray-700/50
                     bg-gray-800/60 text-gray-400 hover:text-white hover:border-amber-500/40
                     text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          Try an Example
        </button>
      </div>

      {/* URL History */}
      {urlHistory.length > 0 && (
        <div className="mt-6 space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {urlHistory.length > 5 && (
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search URLs..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/30
                             text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600
                             transition-colors"
                />
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Tooltip content="Toggle select mode">
              <button
                onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  selectMode
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/60'
                }`}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              </Tooltip>
              <Tooltip content={confirmClearAll ? 'Click again to confirm' : 'Clear recent URLs (keeps saved)'}>
              <button
                onClick={handleClearAllHistory}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  confirmClearAll
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                    : 'text-gray-500 hover:text-red-400 hover:bg-gray-800/60'
                }`}
              >
                {confirmClearAll ? 'Confirm?' : 'Clear recent'}
              </button>
              </Tooltip>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectMode && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700/40">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Square className="w-3.5 h-3.5" />
                )}
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              {selectedIds.size > 0 && (
                <Tooltip content={`Delete ${selectedIds.size} selected`}>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300
                             bg-red-500/10 px-2.5 py-1 rounded-md transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete {selectedIds.size} selected
                </button>
                </Tooltip>
              )}
              {selectedIds.size === 0 && (
                <span className="text-xs text-gray-600 ml-auto">
                  Click items to select
                </span>
              )}
            </div>
          )}

          {/* Saved/Pinned Section */}
          {filteredPinned.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-amber-500/80 uppercase mb-2 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-amber-500/80" />
                Saved ({filteredPinned.length})
              </h3>
              <div className="space-y-1.5">
                {filteredPinned.map(entry => renderHistoryRow(entry, true))}
              </div>
            </div>
          )}

          {/* Recent Section */}
          {filteredRecent.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Recent ({filteredRecent.length})
              </h3>
              <div className="space-y-1.5">
                {visibleRecent.map(entry => renderHistoryRow(entry, false))}
              </div>
              {hiddenRecentCount > 0 && (
                <button
                  onClick={() => setShowAllRecent(!showAllRecent)}
                  className="mt-2 w-full text-center text-xs text-gray-500 hover:text-gray-300
                             py-1.5 rounded-lg hover:bg-gray-800/40 transition-colors
                             flex items-center justify-center gap-1"
                  title={showAllRecent ? 'Show less' : `Show ${hiddenRecentCount} more`}
                >
                  {showAllRecent ? (
                    <><ChevronUp className="w-3 h-3" /> Show less</>
                  ) : (
                    <><ChevronDown className="w-3 h-3" /> Show {hiddenRecentCount} more</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Empty search state */}
          {searchFilter && filteredPinned.length === 0 && filteredRecent.length === 0 && (
            <p className="text-center text-sm text-gray-600 py-4">
              No URLs match &ldquo;{searchFilter}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickEditUrlInput;
