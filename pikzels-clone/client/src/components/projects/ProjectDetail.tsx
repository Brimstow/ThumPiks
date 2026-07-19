import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  FolderOpen,
  Pencil,
  Download,
  Trash2,
  Calendar,
  RefreshCw,
  FolderInput,
  CheckSquare,
  Square,
  X,
  GripVertical,
  Sparkles,
} from 'lucide-react';
import { authGet, authPost, authPut, authDelete } from '../../utils/api';
import { DragDropProvider } from '@dnd-kit/react';
import { useDraggable, useDroppable } from '@dnd-kit/react';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  parentProjectId?: string;
  folderType: 'project' | 'folder';
  depth: number;
  projectPath?: string;
}

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt?: string;
  createdAt: string;
  parameters?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════
// DRAGGABLE THUMBNAIL CARD
// ═══════════════════════════════════════════════════════════════════

interface DraggableThumbnailCardProps {
  thumbnail: Thumbnail;
  isSelected: boolean;
  bulkSelectMode: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onMove: () => void;
  formatTimeAgo: (dateStr: string) => string;
}

const DraggableThumbnailCard: React.FC<DraggableThumbnailCardProps> = ({
  thumbnail,
  isSelected,
  bulkSelectMode,
  onToggleSelect,
  onEdit,
  onDownload,
  onDelete,
  onMove,
  formatTimeAgo,
}) => {
  const { ref } = useDraggable({ id: thumbnail.id, data: { thumbnail } });

  return (
    <div
      ref={ref}
      className={`group relative bg-slate-900 border rounded-xl overflow-hidden transition-all shadow-lg hover:shadow-xl ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : 'border-slate-800 hover:border-slate-600'
      }`}
      onClick={() => bulkSelectMode && onToggleSelect(thumbnail.id)}
    >
      {/* Bulk select checkbox */}
      {bulkSelectMode && (
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(thumbnail.id);
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

      {/* Drag handle */}
      <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-white drop-shadow" />
      </div>

      {/* Image */}
      <div className="aspect-video bg-slate-800 relative overflow-hidden">
        <img
          src={thumbnail.imageUrl}
          alt={thumbnail.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          draggable={false}
        />

        {/* Hover overlay with actions */}
        {!bulkSelectMode && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={onEdit}
              className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              title="Edit in Editor"
              aria-label="Edit in Editor"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onDownload}
              className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title="Download"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onMove}
              className="p-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
              title="Move to Project"
              aria-label="Move to Project"
            >
              <FolderInput className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-slate-200 truncate">
          {thumbnail.title}
        </h4>
        <p className="text-[11px] text-slate-500 mt-1">
          {formatTimeAgo(thumbnail.createdAt)}
        </p>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// DROPPABLE PROJECT TARGET (sidebar during drag)
// ═══════════════════════════════════════════════════════════════════

interface DroppableProjectTargetProps {
  project: { id: string; name: string };
  isCurrentProject: boolean;
}

const DroppableProjectTarget: React.FC<DroppableProjectTargetProps> = ({
  project,
  isCurrentProject,
}) => {
  const { ref, isDropTarget } = useDroppable({ id: `project-${project.id}`, data: { projectId: project.id } });

  return (
    <div
      ref={ref}
      className={`px-3 py-2.5 rounded-lg text-sm transition-all ${
        isCurrentProject
          ? 'bg-slate-700/50 text-slate-500 cursor-default'
          : isDropTarget
            ? 'bg-blue-600/30 border border-blue-500 text-blue-300 scale-[1.02]'
            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        <FolderOpen className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{project.name}</span>
        {isCurrentProject && (
          <span className="text-[10px] text-slate-500 ml-auto">(current)</span>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MOVE TO PROJECT MODAL
// ═══════════════════════════════════════════════════════════════════

interface MoveModalProps {
  open: boolean;
  onClose: () => void;
  projects: Project[];
  currentProjectId: string;
  thumbnailIds: string[];
  onMoveComplete: () => void;
}

const MoveToProjectModal: React.FC<MoveModalProps> = ({
  open,
  onClose,
  projects,
  currentProjectId,
  thumbnailIds,
  onMoveComplete,
}) => {
  const [moving, setMoving] = useState(false);
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter(
    (p) =>
      p.id !== currentProjectId &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleMove = async (targetProjectId: string) => {
    setMoving(true);
    try {
      if (thumbnailIds.length === 1) {
        await authPut(`/api/thumbnails/${thumbnailIds[0]}`, {
          projectId: targetProjectId,
        });
      } else {
        await authPost('/api/thumbnails/bulk-move', {
          thumbnailIds,
          targetProjectId,
        });
      }
      onMoveComplete();
      onClose();
    } catch (err) {
      console.error('Error moving thumbnails:', err);
    } finally {
      setMoving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-slate-100">
            Move {thumbnailIds.length === 1 ? 'Thumbnail' : `${thumbnailIds.length} Thumbnails`} to...
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 mb-3"
          />

          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredProjects.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No other projects found
              </p>
            ) : (
              filteredProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleMove(p.id)}
                  disabled={moving}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
                >
                  <FolderOpen className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {moving && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-slate-800">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm text-slate-400">Moving...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const ProjectDetail: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnailsLoading, setThumbnailsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select state
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Move modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetIds, setMoveTargetIds] = useState<string[]>([]);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Fetch project metadata
  const fetchProject = useCallback(async (projectId: string) => {
    try {
      const response = await authGet(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data.project);
      } else {
        throw new Error('Failed to fetch project');
      }
    } catch (err) {
      setError('Failed to load project');
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch thumbnails belonging to this project
  const fetchThumbnails = useCallback(async (projectId: string) => {
    setThumbnailsLoading(true);
    try {
      const response = await authGet(`/api/thumbnails?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setThumbnails(data.thumbnails || data || []);
      }
    } catch (err) {
      console.error('Error fetching thumbnails:', err);
    } finally {
      setThumbnailsLoading(false);
    }
  }, []);

  // Fetch all projects for move modal / drop targets
  const fetchAllProjects = useCallback(async () => {
    try {
      const response = await authGet('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setAllProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchThumbnails(id);
      fetchAllProjects();
    }
  }, [id, fetchProject, fetchThumbnails, fetchAllProjects]);

  // Handle thumbnail deletion
  const handleDeleteThumbnail = useCallback(async (thumbnailId: string) => {
    if (!window.confirm('Move this thumbnail to trash?')) return;
    try {
      const response = await authDelete(`/api/thumbnails/${thumbnailId}`);
      if (response.ok) {
        setThumbnails((prev) => prev.filter((t) => t.id !== thumbnailId));
      }
    } catch (err) {
      console.error('Error deleting thumbnail:', err);
    }
  }, []);

  // Handle download
  const handleDownload = useCallback((thumbnail: Thumbnail) => {
    const link = document.createElement('a');
    link.href = thumbnail.imageUrl;
    link.download = `${thumbnail.title || 'thumbnail'}-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Multi-select helpers
  const toggleSelect = useCallback((thumbnailId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(thumbnailId)) {
        next.delete(thumbnailId);
      } else {
        next.add(thumbnailId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(thumbnails.map((t) => t.id)));
  }, [thumbnails]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Open move modal for single or bulk
  const openMoveModal = useCallback((ids: string[]) => {
    setMoveTargetIds(ids);
    setMoveModalOpen(true);
  }, []);

  // After move completes, refresh thumbnails and reset selection
  const handleMoveComplete = useCallback(() => {
    if (id) fetchThumbnails(id);
    setSelectedIds(new Set());
    setBulkSelectMode(false);
    fetchAllProjects();
  }, [id, fetchThumbnails, fetchAllProjects]);

  // DnD handler: move thumbnail(s) to target project on drop
  type DragEndHandler = NonNullable<React.ComponentProps<typeof DragDropProvider>['onDragEnd']>;
  const handleDragEnd: DragEndHandler = useCallback(
    (event) => {
      const { source, target } = event.operation;
      if (!source?.id || !target?.id) return;

      const targetData = target.data as { projectId?: string } | undefined;
      const targetProjectId = targetData?.projectId;
      if (!targetProjectId || targetProjectId === id) return;

      // If dragged thumbnail is part of selection, move all selected
      const sourceId = String(source.id);
      const idsToMove = selectedIds.has(sourceId)
        ? Array.from(selectedIds)
        : [sourceId];

      // Fire-and-forget async move
      const doMove = async () => {
        try {
          if (idsToMove.length === 1) {
            await authPut(`/api/thumbnails/${idsToMove[0]}`, {
              projectId: targetProjectId,
            });
          } else {
            await authPost('/api/thumbnails/bulk-move', {
              thumbnailIds: idsToMove,
              targetProjectId,
            });
          }
          handleMoveComplete();
        } catch (err) {
          console.error('Error moving via drag:', err);
        }
      };
      doMove();
    },
    [id, selectedIds, handleMoveComplete]
  );

  // Format relative time
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Other projects for drop targets (excluding current)
  const otherProjects = allProjects.filter((p) => p.id !== id);

  // ═══════════════════════════════════════════════════════════════
  // RENDER STATES
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-200 mb-2">
          {error || 'Project not found'}
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/projects')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to Projects"
                aria-label="Back to Projects"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">
                  {project.name}
                </h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                  {project.description && <span>{project.description}</span>}
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" />
                    {thumbnails.length} thumbnail{thumbnails.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {formatTimeAgo(project.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {thumbnails.length > 0 && !bulkSelectMode && (
                <button
                  onClick={() => setBulkSelectMode(true)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Select multiple"
                  aria-label="Select multiple"
                >
                  <Square className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <button
                onClick={() => {
                  if (id) fetchThumbnails(id);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Refresh thumbnails"
                aria-label="Refresh thumbnails"
              >
                <RefreshCw className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Bulk action bar */}
          {bulkSelectMode && (
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-300">
                  {selectedIds.size} selected
                </span>
                {selectedIds.size < thumbnails.length && (
                  <button
                    onClick={selectAll}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Select all {thumbnails.length}
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    onClick={deselectAll}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Deselect all
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => openMoveModal(Array.from(selectedIds))}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  >
                    <FolderInput className="w-4 h-4" />
                    Move {selectedIds.size} to...
                  </button>
                )}
                <button
                  onClick={() => {
                    setBulkSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Thumbnail Grid */}
          {thumbnailsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
              <p className="text-slate-400 text-sm">Loading thumbnails...</p>
            </div>
          ) : thumbnails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
              <FolderOpen className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No thumbnails yet
              </h3>
              <p className="text-slate-500 text-sm mb-6 max-w-md text-center">
                Save thumbnails to this project from Quick Edit, the Canvas
                Editor, or AI generation tools.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => navigate('/dashboard/quick-edit')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Quick Edit
                </button>
                <button
                  onClick={() => navigate('/dashboard/editor')}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Canvas Editor
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {thumbnails.map((thumbnail) => (
                <DraggableThumbnailCard
                  key={thumbnail.id}
                  thumbnail={thumbnail}
                  isSelected={selectedIds.has(thumbnail.id)}
                  bulkSelectMode={bulkSelectMode}
                  onToggleSelect={toggleSelect}
                  onEdit={() => navigate(`/editor/${thumbnail.id}`)}
                  onDownload={() => handleDownload(thumbnail)}
                  onDelete={() => handleDeleteThumbnail(thumbnail.id)}
                  onMove={() => openMoveModal([thumbnail.id])}
                  formatTimeAgo={formatTimeAgo}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: drop targets for other projects */}
        {otherProjects.length > 0 && thumbnails.length > 0 && (
          <div className="w-56 flex-shrink-0 hidden lg:block">
            <div className="sticky top-6">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Drop to move
              </h3>
              <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                {otherProjects.map((p) => (
                  <DroppableProjectTarget
                    key={p.id}
                    project={p}
                    isCurrentProject={p.id === id}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Move to Project Modal */}
      <MoveToProjectModal
        open={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        projects={allProjects}
        currentProjectId={id || ''}
        thumbnailIds={moveTargetIds}
        onMoveComplete={handleMoveComplete}
      />
    </DragDropProvider>
  );
};

export default ProjectDetail;
