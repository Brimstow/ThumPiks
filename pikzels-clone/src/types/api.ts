// API Request/Response types

export interface CreateThumbnailRequest {
  title: string;
  imageUrl?: string;
  prompt: string;
  parameters?: Record<string, any>;
  projectId: string;
}

export interface UpdateThumbnailRequest {
  title?: string;
  imageUrl?: string;
  prompt?: string;
  parameters?: Record<string, any>;
}

export interface ThumbnailFilters {
  search?: string;
  projectId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  style?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SocialShareRequest {
  thumbnailId: string;
  platforms: string[];
  message?: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  parentId?: string;
  type: 'project' | 'folder';
}

export interface UserSettingsRequest {
  settings: Record<string, any>;
}

// Standard API error response
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
  timestamp: string;
}

// Generic list response
export interface ListResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}