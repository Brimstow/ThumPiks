// Shared authentication service for web and mobile apps
export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export class AuthService {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Set the authentication token
  setToken(token: string) {
    this.token = token;
  }

  // Get the authentication token
  getToken(): string | null {
    return this.token;
  }

  // Clear the authentication token
  clearToken() {
    this.token = null;
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to login');
    }

    const data = await response.json();
    this.token = data.token;
    return data;
  }

  // Register user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to register');
    }

    const data = await response.json();
    this.token = data.token;
    return data;
  }

  // Get user profile
  async getProfile(): Promise<User> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/user/profile`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch profile');
    }

    const data = await response.json();
    return data.user;
  }

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    if (!this.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${this.baseUrl}/api/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ user: userData }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update profile');
    }

    const data = await response.json();
    return data.user;
  }

  // Logout user
  async logout(): Promise<void> {
    // Clear the token locally
    this.clearToken();
    
    // Note: In a real implementation, you might want to call a logout endpoint
    // to invalidate the token on the server side
  }
}