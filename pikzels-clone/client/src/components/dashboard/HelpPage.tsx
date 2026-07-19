import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  Mail,
  X,
  FileText,
} from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import { useDebounce } from '../../hooks/useDebounce';
import {
  HELP_CATEGORIES,
  HELP_ARTICLES,
  searchHelp,
  getPopularArticles,
  getArticlesByCategory,
  getCategoryBySlug,
} from './help/helpData';

const HelpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 200);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search filtering
  const { filteredCategories, filteredArticles } = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return {
        filteredCategories: HELP_CATEGORIES,
        filteredArticles: [] as typeof HELP_ARTICLES,
      };
    }
    const results = searchHelp(debouncedQuery);
    return {
      filteredCategories: results.categories,
      filteredArticles: results.articles,
    };
  }, [debouncedQuery]);

  const popularArticles = useMemo(() => getPopularArticles(), []);
  const isSearching = debouncedQuery.trim().length > 0;

  // "/" keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  return (
    <>
      {/* Help Hero Section */}
      <div className="relative mb-16 text-center">
        <div className="absolute inset-0 -top-12 mx-auto h-64 max-w-4xl rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 blur-3xl -z-10" />

        <h1 className="text-4xl sm:text-5xl font-semibold text-slate-50 tracking-tight mb-4">
          How can we help you?
        </h1>
        <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
          Search our knowledge base or browse categories below to find answers about
          generating thumbnails, billing, and your account.
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative group">
          <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100" />
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for articles, guides, and more..."
              aria-label="Search help articles"
              className="w-full pl-12 pr-20 py-4 bg-[#020818] border border-slate-800 rounded-2xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl shadow-black/20"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <Search className="w-5 h-5" />
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchQuery ? (
                <button
                  onClick={clearSearch}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <span className="hidden sm:block text-xs text-slate-600 border border-slate-800 rounded px-1.5 py-0.5">
                  /
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Indicator */}
      {isSearching && (
        <div className="mb-8 text-center" aria-live="polite">
          <p className="text-slate-400 text-sm">
            Showing {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} and{' '}
            {filteredArticles.length} {filteredArticles.length === 1 ? 'article' : 'articles'} for{' '}
            <span className="text-slate-200">"{debouncedQuery}"</span>
            <button
              onClick={clearSearch}
              className="ml-2 text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            >
              Clear search
            </button>
          </p>
        </div>
      )}

      {/* Categories Grid */}
      {filteredCategories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredCategories.map((category) => {
            const articleCount = getArticlesByCategory(category.slug).length;
            return (
              <Link
                key={category.slug}
                to={`/dashboard/help/${category.slug}`}
                className="group p-6 rounded-2xl bg-[#020818] border border-slate-800 hover:border-slate-700 hover:bg-slate-900/50 transition-all duration-300 relative overflow-hidden text-left block"
              >
                <div className="flex items-start justify-between mb-4">
                  <Tooltip content={category.title} side="top">
                    <div
                      className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${category.color} group-hover:scale-110 transition-transform`}
                    >
                      <category.icon className="w-6 h-6" />
                    </div>
                  </Tooltip>
                  <span className="text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-full px-2.5 py-1">
                    {articleCount} {articleCount === 1 ? 'article' : 'articles'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{category.title}</h3>
                <p className="text-sm text-slate-400">{category.description}</p>
              </Link>
            );
          })}
        </div>
      )}

      {/* No categories match */}
      {isSearching && filteredCategories.length === 0 && filteredArticles.length === 0 && (
        <div className="text-center py-16 mb-16">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg mb-2">No results found</p>
          <p className="text-slate-500 text-sm">
            Try a different search term or{' '}
            <button onClick={clearSearch} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              browse all categories
            </button>
          </p>
        </div>
      )}

      {/* Search Results — matched articles */}
      {isSearching && filteredArticles.length > 0 && (
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-slate-50 mb-6 tracking-tight">
            Search Results
          </h2>
          <div className="grid gap-4">
            {filteredArticles.map((article) => {
              const category = getCategoryBySlug(article.categorySlug);
              return (
                <Link
                  key={article.slug}
                  to={`/dashboard/help/${article.categorySlug}/${article.slug}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {category && (
                        <span className={`text-xs ${category.color} bg-slate-800 rounded-full px-2 py-0.5`}>
                          {category.title}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-300 font-medium group-hover:text-blue-400 transition-colors block truncate">
                      {article.title}
                    </span>
                    <span className="text-sm text-slate-500 block truncate mt-0.5">
                      {article.summary}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 ml-4 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Articles Section — only when not searching */}
      {!isSearching && popularArticles.length > 0 && (
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-2xl font-semibold text-slate-50 mb-6 tracking-tight">
            Popular Articles
          </h2>
          <div className="grid gap-4">
            {popularArticles.map((article) => (
              <Link
                key={article.slug}
                to={`/dashboard/help/${article.categorySlug}/${article.slug}`}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all group"
              >
                <span className="text-slate-300 font-medium group-hover:text-blue-400 transition-colors">
                  {article.title}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Contact Support Footer */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#020818] p-8 sm:p-12 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 to-slate-900/0" />
        <div className="relative z-10">
          <h3 className="text-2xl font-semibold text-slate-50 mb-3 tracking-tight">
            Still need help?
          </h3>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Our support team is available Mon-Fri, 9am - 5pm EST to assist you with any questions or
            issues.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Tooltip content="Send us an email" side="top">
              <button
                onClick={() => navigate('/contact')}
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200 transition-colors w-full sm:w-auto"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
};

export default HelpPage;
