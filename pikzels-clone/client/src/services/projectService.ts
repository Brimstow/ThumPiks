// Project service types for the ProjectsPage component

// Preview thumbnail type for folder previews
export interface PreviewThumbnail {
  id: string;
  imageUrl: string;
  title?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null; // Changed from undefined to null for compatibility
  thumbnailCount?: number;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  category?: string;
  // 🏗️ HIERARCHICAL STRUCTURE FIELDS
  parentProjectId?: string;
  folderType: 'project' | 'folder';
  depth: number;
  projectPath?: string;
  // Additional fields for compatibility
  userId?: string;
  teamId?: string;
  featuredThumbnailId?: string;
  featuredThumbnail?: {
    imageUrl: string;
  };
  // Preview thumbnails for folder cards
  previewThumbnails?: PreviewThumbnail[];
}

export interface ProjectTreeNode {
  id: string;
  name: string;
  type: 'project' | 'folder';
  children?: ProjectTreeNode[];
  depth: number;
  isSelected?: boolean;
  isExpanded?: boolean;
  parentProjectId?: string;
  folderType: 'project' | 'folder';
}

export interface ProjectBreadcrumbItem {
  id: string;
  name: string;
  type: 'project' | 'folder';
  folderType?: 'project' | 'folder'; // For compatibility
}