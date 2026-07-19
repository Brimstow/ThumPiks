// Shared thumbnail service for web and mobile apps
export interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  parameters: any;
  projectId: string;
  userId: string;
  createdAt: string;
  isFeatured: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  featuredThumbnailId?: string;
  // 🏗️ HIERARCHICAL STRUCTURE FIELDS
  parentProjectId?: string;    // Reference to parent project (null = root)
  folderType: 'project' | 'folder'; // Type of folder
  depth: number;               // 0=root, 1=sub-project, 2=folder
  projectPath?: string;        // Full path (e.g., "/root/sub1/sub2")
}

export interface GenerateThumbnailRequest {
  prompt: string;
  style: string;
  projectId: string;
}

export interface GenerateThumbnailResponse {
  thumbnails: Thumbnail[];
}

export class ThumbnailService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Set the authentication token
  setToken(token: string) {
    this.token = token;
  }

  // Get thumbnails for the current user
  async getThumbnails(filters?: {
    search?: string;
    projectId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    style?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<Thumbnail[]> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${this.baseUrl}/api/thumbnails?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch thumbnails');
    }

    const data = await response.json();
    return data.thumbnails;
  }

  // Get thumbnail by ID
  async getThumbnailById(id: string): Promise<Thumbnail> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/thumbnails/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch thumbnail');
    }

    const data = await response.json();
    return data.thumbnail;
  }

  // Generate new thumbnails
  async generateThumbnails(request: GenerateThumbnailRequest): Promise<GenerateThumbnailResponse> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/thumbnails/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate thumbnails');
    }

    const data = await response.json();
    return data;
  }

  // Update thumbnail
  async updateThumbnail(id: string, updates: Partial<Thumbnail>): Promise<Thumbnail> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/thumbnails/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update thumbnail');
    }

    const data = await response.json();
    return data.thumbnail;
  }

  // Delete thumbnail
  async deleteThumbnail(id: string): Promise<void> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/thumbnails/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete thumbnail');
    }
  }

  // Get projects for the current user
  async getProjects(): Promise<Project[]> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch projects');
    }

    const data = await response.json();
    return data.projects;
  }

  // Create a new project
  async createProject(projectData: { name: string; description?: string }): Promise<Project> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create project');
    }

    const data = await response.json();
    return data.project;
  }

  // Update a project
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/projects/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update project');
    }

    const data = await response.json();
    return data.project;
  }

  // Delete a project
  async deleteProject(id: string): Promise<void> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/projects/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete project');
    }
  }
}