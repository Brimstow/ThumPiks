import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Plus,
  FolderOpen,
  Loader2,
  AlertCircle,
  Calendar,
  Folder,
  MoreVertical,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Search,
  X,
  CheckSquare,
  Square,
  Copy,
  Star,
  Archive,
} from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import type { Project } from '../../services/projectService';
import Tooltip from '../ui/Tooltip';
import CreateProjectModal from '../projects/CreateProjectModal';
import EditProjectModal from '../projects/EditProjectModal';
import ProjectFilters, { type FilterState } from '../projects/ProjectFilters';

const ProjectsPage: React.FC = () => {
  // ============================================================================
  // URL STATE MANAGEMENT
  // ============================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Track if this is initial mount
  const isInitialMount = useRef(true);

  // Track if we're currently updating URL (to prevent feedback loop)
  const isUpdatingUrl = useRef(false);

  // Store previous URL to detect actual navigation changes
  const previousUrlRef = useRef<string>('');

  // ============================================================================
  // HOOKS & STATE
  // ============================================================================

  const {
    projects,
    loading,
    error,
    fetchProjects,
    refetch,
    createNewProject,
    updateExistingProject,
    deleteExistingProject,
    duplicateExistingProject,
    archiveExistingProject,
    unarchiveExistingProject,
  } = useProjects();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Separate state for delete confirmation to avoid stale selectedProject issues
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Bulk selection state
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(
    new Set()
  );
  const [bulkSelectMode, setBulkSelectMode] = useState<boolean>(false);

  // Tab state for type filtering (all/projects/folders)
  const [activeTab, setActiveTab] = useState<'all' | 'projects' | 'folders'>(
    'all'
  );

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    folderType: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    type: 'all',
    category: 'all',
    dateSort: 'newest',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(12); // 12 projects per page for 4-column grid

  // Keyboard shortcuts help modal
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);

  // Read from URL on mount AND on browser navigation (back/forward)
  useEffect(() => {
    const currentUrl = location.pathname + location.search;

    // Skip if URL hasn't actually changed (prevents re-renders from same URL)
    if (previousUrlRef.current === currentUrl && !isInitialMount.current) {
      return;
    }

    // Skip if we're the ones updating the URL
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false;
      previousUrlRef.current = currentUrl;
      return;
    }

    const urlCategory = searchParams.get('category') || 'all';
    const urlType = searchParams.get('type') || 'all';
    const urlSearch = searchParams.get('search') || '';
    const urlSort = searchParams.get('sort') || 'newest';
    const urlTab = searchParams.get('tab') || 'all';

    // Update state from URL
    setActiveTab(urlTab as 'all' | 'projects' | 'folders');
    setFilters(prev => ({
      ...prev,
      searchTerm: urlSearch,
      folderType: urlType as FilterState['folderType'],
      type: urlType as FilterState['type'],
      category: urlCategory,
      dateSort: urlSort as FilterState['dateSort'],
    }));
    setSearchQuery(urlSearch);

    // Mark that we've completed initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    // Update previous URL
    previousUrlRef.current = currentUrl;
  }, [location.key, location.pathname, location.search, searchParams]);

  // ============================================================================
  // TAB AND FILTER HANDLERS
  // ============================================================================

  const handleTabChange = (tab: 'all' | 'projects' | 'folders') => {
    setActiveTab(tab);

    // Map tab to filter type (tabs use plural, filters use singular)
    const filterType =
      tab === 'projects' ? 'project' : tab === 'folders' ? 'folder' : 'all';

    // Update filters based on tab
    setFilters(prev => ({
      ...prev,
      type: filterType,
      folderType: filterType,
    }));
  };

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  const handleCreateProject = async (data: any) => {
    const result = await createNewProject(data);
    if (result) {
      // Success - modal will close automatically
      // Note: No need to refetch - optimistic update already added the project to state
    }
  };

  const handleEditProject = async (updates: {
    name?: string;
    description?: string;
    category?: string;
  }) => {
    if (!selectedProject) return;

    const result = await updateExistingProject(selectedProject.id, updates);
    if (result) {
      setShowEditModal(false);
      setSelectedProject(null);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const success = await deleteExistingProject(projectId);
      if (success) {
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
        setSelectedProject(null);
        setDeleteError(null);
        // Do NOT call fetchProjects() synchronously here.
        // The hook's optimistic update (setProjects(prev => prev.filter(...)))
        // already removed the project from state instantly.
        // An immediate refetch races against server-side cache invalidation
        // and can return stale data that re-adds the deleted project.
        // Instead, schedule a background refetch after a short delay so the
        // server cache has time to clear.
        setTimeout(() => {
          fetchProjects();
        }, 1500);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Failed to delete project. It may have thumbnails or sub-projects that need to be removed first.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicateProject = async (projectId: string) => {
    const duplicate = await duplicateExistingProject(projectId);
    if (duplicate) {
      setSelectedProject(null);
      fetchProjects(); // Refetch all projects without filters
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    const archived = await archiveExistingProject(projectId);
    if (archived) {
      setSelectedProject(null);
      fetchProjects(); // Refetch all projects without filters
    }
  };

  const handleUnarchiveProject = async (projectId: string) => {
    const unarchived = await unarchiveExistingProject(projectId);
    if (unarchived) {
      setSelectedProject(null);
      fetchProjects(); // Refetch all projects without filters
    }
  };

  // ============================================================================
  // BULK SELECTION HANDLERS
  // ============================================================================

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedProjects(new Set(visibleProjects.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedProjects(new Set());
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedProjects);
    let successCount = 0;

    for (const id of idsToDelete) {
      const success = await deleteExistingProject(id);
      if (success) successCount++;
    }

    // Reset selection
    setSelectedProjects(new Set());
    setBulkSelectMode(false);

    // Refresh
    fetchProjects(); // Refetch all projects without filters
  };

  // ============================================================================
  // FILTERING & SORTING LOGIC
  // ============================================================================

  const visibleProjects = useMemo(() => {
    // Start with all projects
    let filtered = projects;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        project =>
          project.name.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(
        project => project.folderType === filters.type
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(
        project => project.category === filters.category
      );
    }

    // Apply date sorting
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();

      if (filters.dateSort === 'newest') {
        return dateB - dateA; // Newest first
      } else if (filters.dateSort === 'oldest') {
        return dateA - dateB; // Oldest first
      } else if (filters.dateSort === 'modified') {
        return dateB - dateA; // Recently modified (same as newest)
      } else if (filters.dateSort === 'name-asc') {
        return a.name.localeCompare(b.name); // A-Z
      } else if (filters.dateSort === 'name-desc') {
        return b.name.localeCompare(a.name); // Z-A
      }
      return 0;
    });

    return sorted;
  }, [projects, searchQuery, filters]);

  // Pagination logic
  const totalPages = Math.ceil(visibleProjects.length / itemsPerPage);
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return visibleProjects.slice(startIndex, endIndex);
  }, [visibleProjects, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery]);

  // Handle filter changes from ProjectFilters component
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setSearchQuery(newFilters.searchTerm);
  };

  // Update URL when filters change - push to history for back button support
  // Use navigate() instead of setSearchParams() to avoid the unstable setSearchParams dependency
  useEffect(() => {
    // Skip URL updates during initial mount
    if (isInitialMount.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('tab', activeTab);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.type !== 'all') params.set('type', filters.type);
      if (searchQuery) params.set('search', searchQuery);
      if (filters.dateSort !== 'newest') params.set('sort', filters.dateSort);

      const newUrl = params.toString() ? `?${params.toString()}` : '';
      const currentUrl = location.search;

      // Only navigate if URL actually changed
      if (newUrl !== currentUrl) {
        // Mark that we're updating the URL (to prevent feedback loop)
        isUpdatingUrl.current = true;

        // Push to history using navigate (stable function)
        navigate(location.pathname + newUrl, { replace: false });
      }
    }, 300); // Debounce to avoid rapid URL updates

    return () => clearTimeout(timeoutId);
  }, [
    activeTab,
    filters.category,
    filters.type,
    searchQuery,
    filters.dateSort,
    location.pathname,
    location.search,
    navigate,
  ]);

  // Fetch projects only when NON-SEARCH filters change
  // Search is handled client-side via visibleProjects useMemo
  useEffect(() => {
    // Don't refetch for search - use client-side filtering instead
    const filterParams = {
      category: filters.category !== 'all' ? filters.category : undefined,
      type: filters.type !== 'all' ? filters.type : undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      isArchived: false, // Don't show archived projects by default
    };

    // Only fetch if we have non-search filter criteria
    const hasNonSearchFilters = Object.entries(filterParams).some(
      ([key, param]) =>
        key !== 'searchTerm' && param !== undefined && param !== ''
    );

    if (hasNonSearchFilters) {
      fetchProjects(filterParams);
    } else {
      fetchProjects();
    }
  }, [
    filters.category,
    filters.type,
    filters.sortBy,
    filters.sortOrder,
    fetchProjects,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow Escape to blur input
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // N - New Project
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowCreateModal(true);
      }

      // / - Focus Search
      if (e.key === '/') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }

      // ? - Show Keyboard Help
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShowKeyboardHelp(true);
      }

      // Escape - Close modals
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowEditModal(false);
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
        setDeleteError(null);
        setShowKeyboardHelp(false);
        setSelectedProject(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoize filters prop to prevent unnecessary re-renders and focus loss
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Format date to relative time (e.g., "2 days ago")
   */
  const formatTimeAgo = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 30) return `${diffInDays} days ago`;
    if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(diffInDays / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  };

  /**
   * Get icon for project type
   */
  const getProjectIcon = (project: Project) => {
    if (project.folderType === 'folder') return Folder;
    if (project.featuredThumbnail) return ImageIcon;
    return FolderOpen;
  };

  /**
   * Get icon color based on project properties
   */
  const getIconColor = (project: Project): string => {
    if (project.folderType === 'folder') return 'text-yellow-500';
    return 'text-slate-400';
  };

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-2">
            Projects
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            Manage and organize your creative projects, design assets, and
            thumbnails in one centralized workspace to maintain consistency
            across all your channels.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button
              onClick={() => refetch()}
              className="text-xs text-red-300 hover:text-red-200 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Loading projects...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
          <FolderOpen className="w-16 h-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            No projects yet
          </h3>
          <p className="text-slate-500 text-sm mb-6 max-w-md text-center">
            Create your first project to start organizing your thumbnails and
            design assets.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Create Your First Project
          </button>
        </div>
      )}

      {/* Projects Layout */}
      {!loading && !error && projects.length > 0 && (
        <div className="mb-12">
          {/* Filter Bar - handles all search and filtering */}
          <ProjectFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            className="mb-6"
          />

          {/* Tab Navigation for Type Filtering */}
          <div className="flex items-center gap-1 border-b border-slate-800 mb-6">
            <button
              onClick={() => handleTabChange('all')}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              All projects ({projects.length})
              {activeTab === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange('projects')}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'projects'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Projects (
              {projects.filter(p => p.folderType === 'project').length})
              {activeTab === 'projects' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
              )}
            </button>
            <button
              onClick={() => handleTabChange('folders')}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'folders'
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Folders ({projects.filter(p => p.folderType === 'folder').length})
              {activeTab === 'folders' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>
              )}
            </button>
          </div>

          {/* Bulk Action Toolbar */}
          {bulkSelectMode && (
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-300">
                  {selectedProjects.size} selected
                </span>
                {selectedProjects.size < visibleProjects.length && (
                  <button
                    onClick={selectAllVisible}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Select all {visibleProjects.length}
                  </button>
                )}
                {selectedProjects.size > 0 && (
                  <button
                    onClick={deselectAll}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Deselect all
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedProjects.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete {selectedProjects.size}
                  </button>
                )}
                <button
                  onClick={() => {
                    setBulkSelectMode(false);
                    setSelectedProjects(new Set());
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mb-5 group cursor-pointer">
            {!bulkSelectMode && visibleProjects.length > 0 && (
              <Tooltip content="Select multiple" side="top">
                <button
                  onClick={() => setBulkSelectMode(true)}
                  className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                >
                  <Square className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </Tooltip>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              {activeTab === 'all'
                ? 'All Projects'
                : activeTab === 'projects'
                  ? 'Projects'
                  : 'Folders'}
            </h2>
            <span className="bg-slate-800 text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full">
              {visibleProjects.length}
            </span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          {visibleProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
              <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
              {searchQuery ? (
                <>
                  <p className="text-slate-400 text-sm mb-2">
                    No projects match "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Clear search
                  </button>
                </>
              ) : filters.type !== 'all' || filters.category !== 'all' ? (
                <>
                  <p className="text-slate-400 text-sm mb-2">
                    No{' '}
                    {filters.type !== 'all' ? filters.type + 's' : 'projects'}
                    {filters.category !== 'all' &&
                      ` in ${filters.category} category`}
                  </p>
                  <button
                    onClick={() =>
                      setFilters({
                        searchTerm: '',
                        folderType: 'all',
                        sortBy: 'name',
                        sortOrder: 'asc',
                        type: 'all',
                        category: 'all',
                        dateSort: 'newest',
                      })
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <p className="text-slate-400 text-sm">
                  No projects in this level yet.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedProjects.map(project => {
                const Icon = getProjectIcon(project);
                const iconColor = getIconColor(project);
                const isSelected = selectedProjects.has(project.id);

                return (
                  <div
                    key={project.id}
                    className="group cursor-pointer relative"
                    onClick={() => {
                      if (bulkSelectMode) {
                        toggleProjectSelection(project.id);
                      } else {
                        // Navigate to project detail when not in bulk select mode
                        navigate(`/projects/${project.id}`);
                      }
                    }}
                  >
                    {/* Bulk Select Checkbox */}
                    {bulkSelectMode && (
                      <div className="absolute top-2 left-2 z-20">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleProjectSelection(project.id);
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isSelected
                              ? 'bg-blue-600 border border-blue-500'
                              : 'bg-black/60 border border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Context Menu Button */}
                    {!bulkSelectMode && (
                      <div
                        className="absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ top: '26px', right: '8px' }}
                      >
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedProject(project);
                          }}
                          className="bg-black/60 hover:bg-black/80 p-2 rounded-lg border border-slate-700 hover:border-slate-600 transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-white" />
                        </button>

                        {/* Dropdown Menu */}
                        {selectedProject?.id === project.id && (
                          <>
                            {/* Click-outside overlay: closes dropdown when clicking anywhere else */}
                            <div
                              className="fixed inset-0 z-0"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedProject(null);
                              }}
                            />
                            <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl min-w-[160px] py-1 z-10">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setShowEditModal(true);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                                Edit
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDuplicateProject(project.id);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <Copy className="w-4 h-4" />
                                Duplicate
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  if (project.isArchived) {
                                    handleUnarchiveProject(project.id);
                                  } else {
                                    handleArchiveProject(project.id);
                                  }
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                                {project.isArchived ? 'Unarchive' : 'Archive'}
                              </button>
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  // Capture project into dedicated delete state (decoupled from dropdown)
                                  setProjectToDelete(project);
                                  setSelectedProject(null); // Close dropdown menu
                                  setDeleteError(null); // Clear any previous error
                                  setShowDeleteConfirm(true); // Open delete confirmation modal
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ── ALL CARDS: folder tab + body shape ── */}
                    <div className="mb-3" style={{ width: '100%' }}>
                      {/* === TAB === */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px' }}>
                        <div className="bg-slate-800 border-t border-l border-r border-slate-800/80"
                          style={{
                            width: '45%',
                            height: '20px',
                            borderBottom: 'none',
                            borderRadius: '12px 12px 0 0',
                          }}
                        />
                      </div>

                      {/* === BODY === */}
                      <div
                        className="relative w-full overflow-hidden border border-slate-800/80 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl"
                        style={{
                          paddingBottom: '62.5%',
                          borderRadius: '0 12px 12px 12px',
                        }}
                      >
                        <div className="absolute inset-0">
                          {project.previewThumbnails && project.previewThumbnails.length > 0 ? (
                            /* Seamless thumbnail grid over gradient background */
                            <div
                              style={{
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #000000 100%)',
                              }}
                            >
                              <div
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gridTemplateRows: '1fr 1fr',
                                  gap: 0,
                                }}
                              >
                                {project.previewThumbnails.slice(0, 4).map((thumb, idx) => (
                                  <div
                                    key={thumb.id}
                                    style={{ overflow: 'hidden', backgroundColor: 'transparent' }}
                                  >
                                    <img
                                      src={thumb.imageUrl}
                                      alt={thumb.title || `Thumbnail ${idx + 1}`}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      loading="lazy"
                                    />
                                  </div>
                                ))}
                                {Array.from({ length: Math.max(0, 4 - project.previewThumbnails.length) }).map((_, idx) => (
                                  <div key={`empty-${idx}`} style={{ backgroundColor: 'transparent' }} />
                                ))}
                              </div>
                            </div>
                          ) : project.featuredThumbnail?.imageUrl ? (
                            <img
                              src={project.featuredThumbnail.imageUrl}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                              alt={project.name}
                            />
                          ) : (
                            /* Empty — original gradient + centered icon */
                            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center w-full h-full">
                              <Icon className={`w-16 h-16 ${iconColor} opacity-50`} />
                            </div>
                          )}

                          {/* Folder Badge — original style */}
                          {project.folderType === 'folder' && (
                            <div className="absolute top-2 left-2 bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded-lg">
                              <span className="text-yellow-400 text-[10px] font-bold uppercase">Folder</span>
                            </div>
                          )}

                          {/* Count badge */}
                          {project.thumbnailCount !== undefined && project.thumbnailCount > 0 && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '6px',
                                right: '6px',
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                backdropFilter: 'blur(4px)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                zIndex: 10,
                              }}
                            >
                              <ImageIcon style={{ width: '10px', height: '10px', color: '#cbd5e1' }} />
                              <span style={{ fontSize: '10px', fontWeight: 500, color: '#e2e8f0' }}>{project.thumbnailCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors truncate">
                      {project.name}
                    </h3>

                    {project.description && (
                      <p className="text-xs text-slate-500 mb-1 line-clamp-1">
                        {project.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {(project as any).thumbnailCount ?? 0} thumbnails
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Edited {formatTimeAgo(project.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && !error && visibleProjects.length > itemsPerPage && (
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, visibleProjects.length)}{' '}
                of {visibleProjects.length} projects
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-300 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(prev => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateSuccess={async newProject => {
          // Log for debugging
          console.log('Create success, new project:', newProject);

          // Refetch to get the latest data from server
          // With server-side cache invalidation, this should return the new project
          await refetch();
          setShowCreateModal(false);
        }}
      />

      {/* Edit Project Modal */}
      {showEditModal && selectedProject && (
        <EditProjectModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          projectId={selectedProject.id}
          onEditSuccess={async () => {
            await refetch();
            setShowEditModal(false);
            setSelectedProject(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal — reads from projectToDelete (decoupled from dropdown's selectedProject) */}
      {showDeleteConfirm && projectToDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteConfirm(false);
              setProjectToDelete(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            className="bg-slate-900 border border-red-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-red-400 mb-4">
              Delete Project?
            </h2>
            <p className="text-slate-300 text-sm mb-2">
              Are you sure you want to delete{' '}
              <strong className="text-white">{projectToDelete.name}</strong>?
            </p>
            <p className="text-slate-500 text-sm mb-6">
              This action cannot be undone. All thumbnails in this project will
              also be removed.
            </p>
            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{deleteError}</p>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProjectToDelete(null);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(projectToDelete.id)}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showKeyboardHelp && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowKeyboardHelp(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300 text-sm">New Project</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono">
                  N
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300 text-sm">Focus Search</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono">
                  /
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-300 text-sm">
                  Close Modal / Blur Input
                </span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono">
                  Esc
                </kbd>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-300 text-sm">Show This Help</span>
                <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 font-mono">
                  ?
                </kbd>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectsPage;
