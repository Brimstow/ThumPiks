import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';

interface Project {
  id: string;
  name: string;
  description?: string;
  folderType: 'project' | 'folder';
}

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onEditSuccess: () => void;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  open,
  onOpenChange,
  projectId,
  onEditSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderType, setFolderType] = useState<'project' | 'folder'>('project');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProject, setLoadingProject] = useState(false);

  // Fetch project data when modal opens
  useEffect(() => {
    if (open && projectId) {
      fetchProject();
    }
  }, [open, projectId]);

  const fetchProject = async () => {
    if (!projectId) return;

    setLoadingProject(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      const project: Project = data.project;
      setName(project.name);
      setDescription(project.description || '');
      setFolderType(project.folderType);
    } catch (error) {
      console.error('Error fetching project:', error);
      alert('Failed to load project data');
      onOpenChange(false);
    } finally {
      setLoadingProject(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          folderType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      console.log('✅ Success: Project updated successfully');
      onEditSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('❌ Error: Failed to update project', error);
      alert('Failed to update project');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setFolderType('project');
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              Edit {folderType === 'project' ? 'Project' : 'Folder'}
            </h3>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>

          {loadingProject ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Type
                </label>
                <select
                  value={folderType}
                  onChange={e =>
                    setFolderType(e.target.value as 'project' | 'folder')
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                >
                  <option value="project">Project</option>
                  <option value="folder">Folder</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Name *
                </label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  placeholder={`Enter ${folderType} name`}
                  required
                  disabled={isLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Add a description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProjectModal;
