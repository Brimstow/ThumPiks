import React from 'react';

interface ProjectBreadcrumbItem {
  id: string;
  name: string;
  type: 'project' | 'folder';
}

interface ProjectBreadcrumbProps {
  items: ProjectBreadcrumbItem[];
  onSelect: (itemId: string) => void;
  className?: string;
}

const ProjectBreadcrumb: React.FC<ProjectBreadcrumbProps> = ({
  items,
  onSelect,
  className = ''
}) => {
  if (items.length === 0) {
    return (
      <div className={`text-sm text-slate-400 italic ${className}`}>
        No project selected
      </div>
    );
  }

  return (
    <nav className={`flex items-center ${className}`} aria-label="Project breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center">
            <button
              onClick={() => onSelect(item.id)}
              className={`flex items-center px-2 py-1 rounded text-sm hover:bg-slate-800 ${
                index === items.length - 1 
                  ? 'font-medium text-slate-200 cursor-default' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              disabled={index === items.length - 1}
            >
              {item.type === 'folder' ? (
                <span className="mr-1 text-yellow-600">📁</span>
              ) : (
                <span className="mr-1 text-blue-600">📊</span>
              )}
              <span className="truncate max-w-[120px]">{item.name}</span>
            </button>
            
            {index < items.length - 1 && (
              <svg
                className="w-4 h-4 text-slate-500 mx-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default ProjectBreadcrumb;