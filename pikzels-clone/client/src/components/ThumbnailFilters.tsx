import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ThumbnailFiltersProps {
  onFilterChange: (filters: {
    search: string;
    projectId: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    style: string;
    dateFrom: string;
    dateTo: string;
  }) => void;
  projects: { id: string; name: string }[];
}

const ThumbnailFilters: React.FC<ThumbnailFiltersProps> = ({
  onFilterChange,
  projects,
}) => {
  const isDark = document.documentElement.classList.contains('dark');
  const theme = isDark ? 'dark' : 'light';
  const [filters, setFilters] = useState({
    search: '',
    projectId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    style: '',
    dateFrom: '',
    dateTo: '',
  });

  // Apply filters whenever they change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      projectId: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      style: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.search !== '' ||
      filters.projectId !== '' ||
      filters.sortBy !== 'createdAt' ||
      filters.sortOrder !== 'desc' ||
      filters.style !== '' ||
      filters.dateFrom !== '' ||
      filters.dateTo !== ''
    );
  };

  return (
    <div
      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-4 mb-6`}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label
            htmlFor="search"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            Search
          </label>
          <input
            type="text"
            id="search"
            name="search"
            value={filters.search}
            onChange={handleInputChange}
            placeholder="Title or prompt..."
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        {/* Project */}
        <div>
          <label
            htmlFor="projectId"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            value={filters.projectId}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Style */}
        <div>
          <label
            htmlFor="style"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            Style
          </label>
          <select
            id="style"
            name="style"
            value={filters.style}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="">All Styles</option>
            <option value="bold">Bold</option>
            <option value="minimalist">Minimalist</option>
            <option value="dramatic">Dramatic</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label
            htmlFor="sortBy"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            Sort By
          </label>
          <select
            id="sortBy"
            name="sortBy"
            value={filters.sortBy}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="createdAt">Date Created</option>
            <option value="title">Title</option>
            <option value="prompt">Prompt</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label
            htmlFor="sortOrder"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            Sort Order
          </label>
          <select
            id="sortOrder"
            name="sortOrder"
            value={filters.sortOrder}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label
            htmlFor="dateFrom"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            From Date
          </label>
          <input
            type="date"
            id="dateFrom"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        {/* Date To */}
        <div>
          <label
            htmlFor="dateTo"
            className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
          >
            To Date
          </label>
          <input
            type="date"
            id="dateTo"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          {hasActiveFilters() && (
            <button
              onClick={handleClearFilters}
              className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                theme === 'dark'
                  ? 'border-gray-600 text-gray-300 bg-gray-700 hover:bg-gray-600'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThumbnailFilters;
