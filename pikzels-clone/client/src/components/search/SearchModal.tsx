/**
 * SearchModal Component
 * Global search modal for finding thumbnails, templates, and tools
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Image,
  Video,
  Wand2,
  Clock,
  TrendingUp,
  ArrowRight,
  Command,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'thumbnail' | 'template' | 'tool' | 'page';
  title: string;
  description: string;
  url: string;
  icon?: React.ReactNode;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Quick actions for empty state
  const quickActions: SearchResult[] = [
    {
      id: 'create',
      type: 'page',
      title: 'Create New Thumbnail',
      description: 'Start creating a new thumbnail',
      url: '/dashboard/create',
      icon: <Image className="w-4 h-4" />,
    },
    {
      id: 'templates',
      type: 'page',
      title: 'Browse Templates',
      description: 'Explore ready-made templates',
      url: '/dashboard/templates',
      icon: <Video className="w-4 h-4" />,
    },
    {
      id: 'ai-tools',
      type: 'page',
      title: 'AI Tools',
      description: 'Use AI-powered editing tools',
      url: '/dashboard/ai-tools',
      icon: <Wand2 className="w-4 h-4" />,
    },
    {
      id: 'trending',
      type: 'page',
      title: 'Trending Thumbnails',
      description: 'See what\'s popular right now',
      url: '/dashboard/trending',
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ];

  // Recent searches (mock data - would come from localStorage or API)
  const recentSearches = [
    'Gaming thumbnails',
    'YouTube banner',
    'Podcast cover',
  ];

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Reset state when opening
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const displayedItems = query ? results : quickActions;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % displayedItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + displayedItems.length) % displayedItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (displayedItems[selectedIndex]) {
            handleResultClick(displayedItems[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, results, selectedIndex]);

  // Search logic (mock - would integrate with API)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Mock search results based on query
    const mockResults: SearchResult[] = [
      {
        id: '1',
        type: 'thumbnail',
        title: `"${query}" - My Thumbnail`,
        description: 'Created 2 days ago',
        url: '/dashboard/thumbnails',
        icon: <Image className="w-4 h-4 text-purple-400" />,
      },
      {
        id: '2',
        type: 'template',
        title: `${query} Template Pack`,
        description: '12 templates available',
        url: '/dashboard/templates',
        icon: <Video className="w-4 h-4 text-blue-400" />,
      },
      {
        id: '3',
        type: 'tool',
        title: `AI ${query} Generator`,
        description: 'Create with AI assistance',
        url: '/dashboard/ai-tools',
        icon: <Wand2 className="w-4 h-4 text-green-400" />,
      },
    ];

    setResults(mockResults);
    setSelectedIndex(0);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    onClose();
    navigate(result.url);
  };

  if (!isOpen) return null;

  const displayedItems = query ? results : quickActions;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl px-3 sm:px-4 z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search thumbnails, templates, tools..."
              className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-base"
            />
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-500 text-xs">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results / Quick Actions */}
          <div className="max-h-[400px] overflow-y-auto">
            {!query && (
              <div className="px-4 py-2">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Quick Actions
                </span>
              </div>
            )}

            {query && results.length === 0 ? (
              <div className="p-8 text-center">
                <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No results found for "{query}"</p>
                <p className="text-xs text-slate-500 mt-1">Try a different search term</p>
              </div>
            ) : (
              displayedItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleResultClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-slate-800/70'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    {item.icon || <Search className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </button>
              ))
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <>
                <div className="px-4 py-2 mt-2 border-t border-slate-800">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Recent Searches
                  </span>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-400">{search}</span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="hidden sm:flex px-4 py-3 border-t border-slate-800 items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800">Esc</kbd> Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchModal;
