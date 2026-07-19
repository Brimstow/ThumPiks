import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { authFetch } from '@/utils/api';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateSuccess: (newProject?: any) => void;
  parentId?: string;
}

interface Toast {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onOpenChange,
  onCreateSuccess,
  parentId
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [folderType, setFolderType] = useState<'project' | 'folder'>('project');
  const [isLoading, setIsLoading] = useState(false);
  
  // Simple toast function since use-toast hook isn't available
  const showToast = (toast: Toast) => {
    console.log(`${toast.variant === 'destructive' ? '❌' : '✅'} ${toast.title}: ${toast.description}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const response = await authFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          parentProjectId: parentId,
          folderType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();
      // API returns { project: newProject }, extract the actual project
      const newProject = data.project || data;
      
      showToast({
        title: 'Success',
        description: `${folderType === 'project' ? 'Project' : 'Folder'} created successfully`,
      });
      
      setName('');
      setDescription('');
      setFolderType('project');
      onCreateSuccess(newProject);  // Pass the newly created project
      onOpenChange(false);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
      console.error('Error creating project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-modal-title"
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700">
          <div className="flex justify-between items-center">
            <h3 id="create-project-modal-title" className="text-lg font-semibold text-white">
              Create New
            </h3>
            <button
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-md"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {/* Type Selection - Side by Side Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Project Card */}
              <button
                type="button"
                onClick={() => setFolderType('project')}
                disabled={isLoading}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  folderType === 'project'
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                {/* Selection indicator */}
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  folderType === 'project'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-600'
                }`}>
                  {folderType === 'project' && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                  folderType === 'project'
                    ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    : 'bg-slate-700'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>

                {/* Label */}
                <h4 className={`font-semibold mb-1 ${
                  folderType === 'project' ? 'text-white' : 'text-slate-300'
                }`}>
                  Project
                </h4>
                <p className="text-sm text-slate-500">
                  Create a new project for your thumbnails and designs
                </p>
              </button>

              {/* Folder Card */}
              <button
                type="button"
                onClick={() => setFolderType('folder')}
                disabled={isLoading}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  folderType === 'folder'
                    ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
                }`}
              >
                {/* Selection indicator */}
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  folderType === 'folder'
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-slate-600'
                }`}>
                  {folderType === 'folder' && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                  folderType === 'folder'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-slate-700'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>

                {/* Label */}
                <h4 className={`font-semibold mb-1 ${
                  folderType === 'folder' ? 'text-white' : 'text-slate-300'
                }`}>
                  Folder
                </h4>
                <p className="text-sm text-slate-500">
                  Organize your projects into folders
                </p>
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-slate-900 text-slate-500">
                  {folderType === 'project' ? 'Project' : 'Folder'} Details
                </span>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={`Enter ${folderType} name`}
                required
                disabled={isLoading}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Add a description (optional)"
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !name.trim()}
              className={`min-w-[120px] text-white ${
                folderType === 'project'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                `Create ${folderType === 'project' ? 'Project' : 'Folder'}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;