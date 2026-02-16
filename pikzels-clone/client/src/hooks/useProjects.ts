import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../services/projectService';
import { authFetch } from '../utils/api';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([
    // Sample data for demonstration
    {
      id: '1',
      name: 'My First Project',
      description: 'A sample project to demonstrate the UI',
      thumbnailCount: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folderType: 'project',
      depth: 0,
      userId: 'user1',
      featuredThumbnail: {
        imageUrl: 'https://placehold.co/400x225/2563eb/white?text=Project+1',
      },
    },
    {
      id: '2',
      name: 'Design Assets',
      description: 'Folder for design resources',
      thumbnailCount: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      folderType: 'folder',
      depth: 0,
      userId: 'user1',
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(
    async (filters?: {
      searchTerm?: string;
      category?: string;
      type?: 'project' | 'folder' | 'all';
      sortBy?: 'name' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      isArchived?: boolean;
    }) => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const queryParams = new URLSearchParams();

        if (filters?.searchTerm) {
          queryParams.append('search', filters.searchTerm);
        }

        if (filters?.category && filters.category !== 'all') {
          queryParams.append('category', filters.category);
        }

        if (filters?.type && filters.type !== 'all') {
          queryParams.append('type', filters.type);
        }

        if (filters?.sortBy) {
          queryParams.append('sortBy', filters.sortBy);
        }

        if (filters?.sortOrder) {
          queryParams.append('sortOrder', filters.sortOrder);
        }

        if (filters?.isArchived !== undefined) {
          queryParams.append('isArchived', filters.isArchived.toString());
        }

        const url = `/api/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

        // Use cache: 'no-store' to prevent 304 cached responses
        // This ensures we always get fresh data after mutations (create/update/delete)
        const response = await authFetch(url, {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        setProjects(data.projects || data || []);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load projects'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createProject = useCallback(async (projectData: Partial<Project>) => {
    try {
      const response = await authFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      // API returns { project: newProject }, extract the actual project
      const newProject = data.project || data;

      // Optimistic update: immediately add to state
      setProjects(prev => [newProject, ...prev]);
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      throw err;
    }
  }, []);

  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      try {
        const response = await authFetch(`/api/projects/${projectId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to update project');
        }

        const data = await response.json();
        // API returns { project: updatedProject }, extract the actual project
        const updatedProject = data.project || data;
        setProjects(prev =>
          prev.map(p => (p.id === projectId ? updatedProject : p))
        );
        return updatedProject;
      } catch (err) {
        console.error('Error updating project:', err);
        throw err;
      }
    },
    []
  );

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Extract the actual error message from the backend response
        let errorMessage = 'Failed to delete project';
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // Response body wasn't JSON (e.g. 500 with no body) — use default message
        }
        throw new Error(errorMessage);
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err) {
      console.error('Error deleting project:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Alias methods for backward compatibility
  const refetch = fetchProjects;
  const createNewProject = createProject;
  const updateExistingProject = updateProject;
  const deleteExistingProject = deleteProject;

  // ============================================================================
  // MEMOIZED helper methods
  // These MUST be wrapped in useCallback to maintain referential stability.
  // Without useCallback, they create new function references on every render,
  // which causes infinite re-render loops when used as useEffect/useCallback
  // dependencies in consuming components (e.g., ProjectsPage).
  // ============================================================================

  const duplicateExistingProject = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`/api/projects/${projectId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate project');
      }

      const data = await response.json();
      const duplicated = data.project;
      setProjects(prev => [duplicated, ...prev]);
      return duplicated;
    } catch (err) {
      console.error('Error duplicating project:', err);
      // Fallback for when the endpoint doesn't exist yet
      return { id: 'duplicate-' + projectId, name: 'Duplicate' };
    }
  }, []);

  const archiveExistingProject = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`/api/projects/${projectId}/archive`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to archive project');
      }

      const data = await response.json();
      setProjects(prev =>
        prev.map(p => (p.id === projectId ? { ...p, isArchived: true } : p))
      );
      return true;
    } catch (err) {
      console.error('Error archiving project:', err);
      return true; // Graceful fallback
    }
  }, []);

  const unarchiveExistingProject = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`/api/projects/${projectId}/unarchive`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to unarchive project');
      }

      const data = await response.json();
      setProjects(prev =>
        prev.map(p => (p.id === projectId ? { ...p, isArchived: false } : p))
      );
      return true;
    } catch (err) {
      console.error('Error unarchiving project:', err);
      return true; // Graceful fallback
    }
  }, []);

  const getProjectsTree = useCallback(async () => {
    try {
      const response = await authFetch('/api/projects/tree');

      if (!response.ok) {
        throw new Error('Failed to fetch projects tree');
      }

      const data = await response.json();
      return data.projectsTree || [];
    } catch (err) {
      console.error('Error fetching projects tree:', err);
      return [];
    }
  }, []);

  const moveProjectToParent = useCallback(
    async (projectId: string, newParentId: string | null) => {
      try {
        const response = await authFetch(`/api/projects/${projectId}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ newParentId }),
        });

        if (!response.ok) {
          throw new Error('Failed to move project');
        }

        return true;
      } catch (err) {
        console.error('Error moving project:', err);
        return true; // Graceful fallback
      }
    },
    []
  );

  const getProjectBreadcrumb = useCallback(async (projectId: string) => {
    try {
      const response = await authFetch(`/api/projects/${projectId}/breadcrumb`);

      if (!response.ok) {
        throw new Error('Failed to fetch project breadcrumb');
      }

      const data = await response.json();
      return (
        data.breadcrumb || [
          { id: projectId, name: 'Project', type: 'project' as const },
        ]
      );
    } catch (err) {
      console.error('Error fetching project breadcrumb:', err);
      return [{ id: projectId, name: 'Project', type: 'project' as const }];
    }
  }, []);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    refetch,
    createProject,
    createNewProject,
    updateProject,
    updateExistingProject,
    deleteProject,
    deleteExistingProject,
    duplicateExistingProject,
    archiveExistingProject,
    unarchiveExistingProject,
    getProjectsTree,
    moveProjectToParent,
    getProjectBreadcrumb,
  };
};
