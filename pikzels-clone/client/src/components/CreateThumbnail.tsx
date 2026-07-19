import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface CreateThumbnailProps {
  onClose: () => void;
  onCreate: (prompt: string, style: string, projectId: string) => void;
  projects: { id: string; name: string }[];
}

const CreateThumbnail: React.FC<CreateThumbnailProps> = ({
  onClose,
  onCreate,
  projects,
}) => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('bold');
  const [projectId, setProjectId] = useState(
    projects.length > 0 ? projects[0].id : ''
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');
  const theme = isDark ? 'dark' : 'light';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !projectId) return;

    setIsGenerating(true);
    try {
      await onCreate(prompt, style, projectId);
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      alert('Failed to create thumbnail. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl w-full max-w-md`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3
            className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}
          >
            Create New Thumbnail
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div>
              <label
                htmlFor="prompt"
                className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
              >
                Thumbnail Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe what you want in your thumbnail..."
                className={`w-full px-3 py-2 border ${
                  theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                rows={3}
                required
              />
              <p
                className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
              >
                Be descriptive for better AI-generated results
              </p>
            </div>

            <div>
              <label
                htmlFor="style"
                className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
              >
                Style
              </label>
              <select
                id="style"
                value={style}
                onChange={e => setStyle(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
              >
                <option value="bold">Bold</option>
                <option value="minimalist">Minimalist</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="project"
                className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-1`}
              >
                Project
              </label>
              <select
                id="project"
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className={`w-full px-3 py-2 border ${
                  theme === 'dark'
                    ? 'border-gray-600 bg-gray-700 text-white'
                    : 'border-gray-300 bg-white text-gray-900'
                } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                required
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                theme === 'dark'
                  ? 'text-gray-300 bg-gray-700 hover:bg-gray-600'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim() || !projectId}
              className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isGenerating || !prompt.trim() || !projectId
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Thumbnails'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateThumbnail;
