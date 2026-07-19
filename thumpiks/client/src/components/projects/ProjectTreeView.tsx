import React, { useState } from 'react';

interface ProjectTreeNode {
  id: string;
  name: string;
  type: 'project' | 'folder';
  children?: ProjectTreeNode[];
  depth: number;
  isSelected?: boolean;
  isExpanded?: boolean;
}

interface ProjectTreeViewProps {
  nodes: ProjectTreeNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
  className?: string;
}

const ProjectTreeView: React.FC<ProjectTreeViewProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onToggleExpand,
  className = ''
}) => {
  const renderNode = (node: ProjectTreeNode) => {
    const isSelected = node.id === selectedNodeId;
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="select-none">
        {/* Node row */}
        <div
          className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-slate-700 ${
            isSelected ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
          }`}
          style={{ paddingLeft: `${node.depth * 20 + 8}px` }}
          onClick={() => onSelectNode(node.id)}
        >
          {/* Expand/Collapse toggle */}
          {hasChildren && (
            <button
              className="mr-1 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id);
              }}
            >
              {node.isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          {/* Icon */}
          <div className="mr-2">
            {node.type === 'folder' ? (
              <span className="text-yellow-600">📁</span>
            ) : (
              <span className="text-blue-600">📊</span>
            )}
          </div>
          
          {/* Node name */}
          <span className={`truncate ${isSelected ? 'font-medium text-blue-400' : 'text-slate-300'}`}>
            {node.name}
          </span>
        </div>
        
        {/* Children */}
        {hasChildren && node.isExpanded && (
          <div className="ml-4">
            {node.children?.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-3 ${className}`}>
      <div className="text-sm font-medium text-slate-300 mb-2 pb-2 border-b border-slate-700">
        Projects & Folders
      </div>
      <div className="overflow-y-auto max-h-96">
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-2">📂</div>
            <p>No projects or folders yet</p>
            <p className="text-sm mt-1">Create your first project to get started</p>
          </div>
        ) : (
          nodes.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};

export default ProjectTreeView;