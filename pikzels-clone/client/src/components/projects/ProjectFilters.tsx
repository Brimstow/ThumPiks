import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui';

export interface FilterState {
  searchTerm: string;
  folderType: 'all' | 'project' | 'folder';
  sortBy: 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  // Legacy fields for backward compatibility
  type: 'all' | 'project' | 'folder';
  category: 'all' | string;
  dateSort: 'newest' | 'oldest' | 'modified' | 'name-asc' | 'name-desc';
}

interface ProjectFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filters,
  onFiltersChange,
  className = ''
}) => {
  // Local state for search input - prevents focus loss
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm);
  
  // Track if user is actively typing - prevents sync from parent during typing
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync from parent (for URL/back button) but NOT during typing
  useEffect(() => {
    // Skip sync if user is typing
    if (isTypingRef.current) {
      return;
    }
    
    if (filters.searchTerm !== localSearchTerm) {
      setLocalSearchTerm(filters.searchTerm);
    }
  }, [filters.searchTerm, localSearchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Mark as typing
    isTypingRef.current = true;
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Reset typing flag after 600ms (longer than parent's 500ms debounce)
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 600);
    
    setLocalSearchTerm(newValue);
    onFiltersChange({
      ...filters,
      searchTerm: newValue
    });
  };

  const handleFolderTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      folderType: e.target.value as FilterState['folderType']
    });
  };

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      sortBy: e.target.value as FilterState['sortBy']
    });
  };

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      sortOrder: e.target.value as FilterState['sortOrder']
    });
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({
      ...filters,
      category: e.target.value
    });
  };

  const handleDateModifiedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    // Map the combined sort option to sortBy and sortOrder
    if (value === 'name-asc') {
      onFiltersChange({ ...filters, sortBy: 'name', sortOrder: 'asc', dateSort: 'name-asc' });
    } else if (value === 'name-desc') {
      onFiltersChange({ ...filters, sortBy: 'name', sortOrder: 'desc', dateSort: 'name-desc' });
    } else if (value === 'newest') {
      onFiltersChange({ ...filters, sortBy: 'updatedAt', sortOrder: 'desc', dateSort: 'newest' });
    } else if (value === 'oldest') {
      onFiltersChange({ ...filters, sortBy: 'createdAt', sortOrder: 'asc', dateSort: 'oldest' });
    } else if (value === 'modified') {
      onFiltersChange({ ...filters, sortBy: 'updatedAt', sortOrder: 'desc', dateSort: 'modified' });
    }
  };

  return (
    <div className={className}>
      {/* Search Bar - Full Width Top Row */}
      <div className="mb-4">
        <Input
          id="search"
          type="text"
          placeholder="Search projects..."
          value={localSearchTerm}
          onChange={handleSearchChange}
          className="w-full bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-slate-600"
        />
      </div>

      {/* Filter Dropdowns - Compact Row Below Search */}
      <div className="flex items-center gap-3 mb-6">
        {/* Type Filter */}
        <select
          id="folderType"
          value={filters.folderType}
          onChange={handleFolderTypeChange}
          className="px-4 py-2 bg-slate-900 border-0 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-slate-800 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23cbd5e1%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_8px_center] bg-no-repeat pr-10"
        >
          <option value="all">Type</option>
          <option value="project">Projects</option>
          <option value="folder">Folders</option>
        </select>

        {/* Category Filter */}
        <select
          id="category"
          value={filters.category}
          onChange={handleCategoryChange}
          className="px-4 py-2 bg-slate-900 border-0 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-slate-800 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23cbd5e1%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_8px_center] bg-no-repeat pr-10"
        >
          <option value="all">Category</option>
          <option value="Design">Design</option>
          <option value="Video">Video</option>
          <option value="Branding">Branding</option>
          <option value="Client Work">Client Work</option>
          <option value="Personal">Personal</option>
          <option value="Marketing">Marketing</option>
        </select>

        {/* Date Modified (Combined Sort) */}
        <select
          id="dateModified"
          value={filters.dateSort}
          onChange={handleDateModifiedChange}
          className="px-4 py-2 bg-slate-900 border-0 rounded-lg text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-slate-800 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23cbd5e1%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3e%3cpolyline points=%226 9 12 15 18 9%22%3e%3c/polyline%3e%3c/svg%3e')] bg-[length:16px_16px] bg-[right_8px_center] bg-no-repeat pr-10"
        >
          <option value="newest">Date modified (Newest)</option>
          <option value="oldest">Date modified (Oldest)</option>
          <option value="modified">Recently Modified</option>
          <option value="name-asc">A-Z</option>
          <option value="name-desc">Z-A</option>
        </select>
      </div>

      {/* Active Filters Summary */}
      {(filters.searchTerm || filters.folderType !== 'all' || filters.category !== 'all') && (
        <div className="mb-4 pb-4 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span>Active filters:</span>
            {filters.searchTerm && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-900/50 text-blue-300 border border-blue-700/50">
                Search: "{filters.searchTerm}"
              </span>
            )}
            {filters.folderType !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/50 text-green-300 border border-green-700/50">
                Type: {filters.folderType}
              </span>
            )}
            {filters.category !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-900/50 text-purple-300 border border-purple-700/50">
                Category: {filters.category}
              </span>
            )}
            <button
              onClick={() => onFiltersChange({
                searchTerm: '',
                folderType: 'all',
                sortBy: 'name',
                sortOrder: 'asc',
                type: 'all',
                category: 'all',
                dateSort: 'newest'
              })}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFilters;