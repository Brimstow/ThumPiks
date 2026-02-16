import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authGet } from '../../utils/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  // 🏗️ HIERARCHICAL STRUCTURE FIELDS
  parentProjectId?: string;
  folderType: 'project' | 'folder';
  depth: number;
  projectPath?: string;
}

const ProjectDetail: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      fetchProject(id);
    }
  }, [id]);

  const fetchProject = async (projectId: string) => {
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Project not found
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          The project you're looking for doesn't exist or you don't have access
          to it.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 shadow-lg overflow-hidden rounded-xl">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-slate-100">
              {project.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Project details and information.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/projects/${project.id}/edit`)}
              className="inline-flex items-center px-3 py-2 border border-slate-600 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to delete this project?'
                  )
                ) {
                  // Handle delete
                }
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <dl>
          <div className="bg-slate-800/50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-slate-400">Project Name</dt>
            <dd className="mt-1 text-sm text-slate-100 sm:mt-0 sm:col-span-2">
              {project.name}
            </dd>
          </div>
          {project.description && (
            <div className="bg-slate-900 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-slate-400">Description</dt>
              <dd className="mt-1 text-sm text-slate-100 sm:mt-0 sm:col-span-2">
                {project.description}
              </dd>
            </div>
          )}
          <div className="bg-slate-800/50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-slate-400">Created At</dt>
            <dd className="mt-1 text-sm text-slate-100 sm:mt-0 sm:col-span-2">
              {new Date(project.createdAt).toLocaleDateString()} at{' '}
              {new Date(project.createdAt).toLocaleTimeString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default ProjectDetail;
