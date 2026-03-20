/**
 * SaveThumbnailModal - Lightweight save modal for all thumbnail flows
 *
 * DRY: Single modal used by useImageActions.saveToLibrary across ALL pages.
 * Pre-fills title + prompt from source metadata. User only sees title + project picker.
 * Auto-creates "My Thumbnails" default project if user has none.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Save, Loader2, FolderPlus, Check } from 'lucide-react';
import { authFetch } from '../../utils/api';
import type { Project } from '../../services/projectService';
import type { SaveMetadata, SaveModalResult } from '../../types/image-actions.types';

// ============================================
// CONSTANTS
// ============================================

const LAST_PROJECT_KEY = 'saveThumbnail_lastProjectId';
const DEFAULT_PROJECT_NAME = 'My Thumbnails';

// ============================================
// AUTO-PROMPT GENERATION (DRY — single source of truth)
// ============================================

function generateAutoPrompt(metadata?: SaveMetadata): string {
  if (metadata?.prompt) return metadata.prompt;

  switch (metadata?.source) {
    case 'quick-edit':
      return metadata?.title
        ? `Video frame: ${metadata.title}`
        : 'Quick Edit thumbnail';
    case 'canvas-editor':
      return 'Created with Canvas Editor';
    case 'preset-editor':
      return `Preset: ${metadata?.title || 'custom'}`;
    case 'vision-tool':
      return 'Vision analysis thumbnail';
    case 'recreate-better':
      return 'Recreated improved thumbnail';
    case 'ai-generate':
      return metadata?.prompt || 'AI generated thumbnail';
    case 'ai-tools':
      return metadata?.prompt || 'AI tools thumbnail';
    default:
      return 'Thumbnail';
  }
}

// ============================================
// PROPS
// ============================================

export interface SaveThumbnailModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (result: SaveModalResult) => void;
  metadata?: SaveMetadata;
  imageUrl?: string;
}

// ============================================
// COMPONENT
// ============================================

const SaveThumbnailModal: React.FC<SaveThumbnailModalProps> = ({
  open,
  onClose,
  onSave,
  metadata,
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Inline create project
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // FETCH PROJECTS
  // ============================================

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await authFetch('/api/projects?type=project&sortBy=updatedAt&sortOrder=desc', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const list: Project[] = data.projects || data || [];
        setProjects(list);
        return list;
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoadingProjects(false);
    }
    return [];
  }, []);

  // ============================================
  // AUTO-CREATE DEFAULT PROJECT
  // ============================================

  const createDefaultProject = useCallback(async (): Promise<Project | null> => {
    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: DEFAULT_PROJECT_NAME,
          description: 'Auto-created project for saved thumbnails',
          folderType: 'project',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.project || data;
      }
    } catch (err) {
      console.error('Failed to create default project:', err);
    }
    return null;
  }, []);

  // ============================================
  // INITIALIZE ON OPEN
  // ============================================

  useEffect(() => {
    if (!open) return;

    // Pre-fill title
    const defaultTitle = metadata?.title || `Thumbnail ${new Date().toLocaleDateString()}`;
    setTitle(defaultTitle);
    setShowNewProject(false);
    setNewProjectName('');

    // Load projects and select default
    (async () => {
      let list = await fetchProjects();

      // Auto-create default project if user has none
      if (list.length === 0) {
        const newProject = await createDefaultProject();
        if (newProject) {
          list = [newProject];
          setProjects(list);
        }
      }

      // Select last-used project or first available
      const lastId = localStorage.getItem(LAST_PROJECT_KEY);
      if (metadata?.projectId) {
        setSelectedProjectId(metadata.projectId);
      } else if (lastId && list.some(p => p.id === lastId)) {
        setSelectedProjectId(lastId);
      } else if (list.length > 0) {
        setSelectedProjectId(list[0].id);
      }

      // Focus title input
      setTimeout(() => titleInputRef.current?.select(), 100);
    })();
  }, [open, metadata, fetchProjects, createDefaultProject]);

  // ============================================
  // CREATE NEW PROJECT INLINE
  // ============================================

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const res = await authFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          folderType: 'project',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newProject: Project = data.project || data;
        setProjects(prev => [newProject, ...prev]);
        setSelectedProjectId(newProject.id);
        setShowNewProject(false);
        setNewProjectName('');
      }
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreatingProject(false);
    }
  };

  // ============================================
  // SAVE HANDLER
  // ============================================

  const handleSave = async () => {
    if (!title.trim() || !selectedProjectId) return;
    setIsSaving(true);

    // Remember project choice
    localStorage.setItem(LAST_PROJECT_KEY, selectedProjectId);

    const result: SaveModalResult = {
      title: title.trim(),
      projectId: selectedProjectId,
      prompt: generateAutoPrompt(metadata),
    };

    onSave(result);
    // Note: caller handles the actual API call and will close the modal
  };

  // ============================================
  // KEYBOARD HANDLING
  // ============================================

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && !e.shiftKey && !showNewProject) {
      e.preventDefault();
      handleSave();
    }
  };

  if (!open) return null;

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-400" />
            Save Thumbnail
          </h3>
          <button
            onClick={onClose}
            aria-label="Close save dialog"
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Title
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My awesome thumbnail"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg
                         text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                         focus:ring-1 focus:ring-blue-500/30 transition-colors text-sm"
            />
          </div>

          {/* Project Picker */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Save to
            </label>
            {loadingProjects ? (
              <div className="flex items-center gap-2 py-3 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading projects...
              </div>
            ) : (
              <>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  aria-label="Select project"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg
                             text-white focus:outline-none focus:border-blue-500
                             focus:ring-1 focus:ring-blue-500/30 transition-colors text-sm
                             cursor-pointer"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                {/* New Project Toggle */}
                {!showNewProject ? (
                  <button
                    onClick={() => setShowNewProject(true)}
                    className="mt-2 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    New Project
                  </button>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleCreateProject(); }
                        if (e.key === 'Escape') setShowNewProject(false);
                      }}
                      placeholder="Project name"
                      autoFocus
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg
                                 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500
                                 text-sm"
                    />
                    <button
                      onClick={handleCreateProject}
                      disabled={creatingProject || !newProjectName.trim()}
                      aria-label="Create project"
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg
                                 disabled:opacity-50 transition-colors text-sm"
                    >
                      {creatingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => { setShowNewProject(false); setNewProjectName(''); }}
                      className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Save destination hint */}
          {selectedProject && (
            <p className="text-xs text-slate-500">
              Will be saved to <span className="text-slate-400">{selectedProject.name}</span>
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700/50 bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800
                       rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !selectedProjectId}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500
                       text-white rounded-lg disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveThumbnailModal;
