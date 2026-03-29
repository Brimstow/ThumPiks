import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';

// Mock the API utilities
jest.mock('../../utils/api', () => ({
  authGet: jest.fn(),
  authPost: jest.fn(),
  publicPost: jest.fn(),
  setTokenExpiration: jest.fn(),
}));

import { publicPost, authGet, authPost, setTokenExpiration } from '../../utils/api';

const mockPublicPost = publicPost as jest.MockedFunction<typeof publicPost>;
const mockAuthGet = authGet as jest.MockedFunction<typeof authGet>;
const mockAuthPost = authPost as jest.MockedFunction<typeof authPost>;

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Test component to access auth context
const TestComponent = () => {
  const { forgotPassword, user, loading } = useAuth();
  const [result, setResult] = React.useState<{ success: boolean; error?: string; message?: string } | null>(null);

  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button
        data-testid="forgot-password-btn"
        onClick={async () => {
          const res = await forgotPassword('test@example.com');
          setResult(res);
        }}
      >
        Forgot Password
      </button>
      {result && (
        <div data-testid="result">
          {result.success ? `Success: ${result.message}` : `Error: ${result.error}`}
        </div>
      )}
    </div>
  );
};

const renderAuth = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    </MemoryRouter>
  );

describe('AuthContext - forgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock initial auth check
    mockAuthGet.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ user: null }),
    } as Response);
  });

  it('should call publicPost with correct endpoint and email', async () => {
    mockPublicPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'If your email is registered, you will receive a password reset link.' }),
    } as Response);

    renderAuth();

    await act(async () => {
      const btn = document.querySelector('[data-testid="forgot-password-btn"]') as HTMLElement;
      btn.click();
    });

    expect(mockPublicPost).toHaveBeenCalledWith('/api/auth/request-password-reset', {
      email: 'test@example.com',
    });
  });

  it('should return success when API responds ok', async () => {
    mockPublicPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Reset email sent!' }),
    } as Response);

    renderAuth();

    await act(async () => {
      const btn = document.querySelector('[data-testid="forgot-password-btn"]') as HTMLElement;
      btn.click();
    });

    await waitFor(() => {
      const result = document.querySelector('[data-testid="result"]');
      expect(result?.textContent).toBe('Success: Reset email sent!');
    });
  });

  it('should return error when API responds with error', async () => {
    mockPublicPost.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Email not found' }),
    } as Response);

    renderAuth();

    await act(async () => {
      const btn = document.querySelector('[data-testid="forgot-password-btn"]') as HTMLElement;
      btn.click();
    });

    await waitFor(() => {
      const result = document.querySelector('[data-testid="result"]');
      expect(result?.textContent).toBe('Error: Email not found');
    });
  });

  it('should handle network errors gracefully', async () => {
    mockPublicPost.mockRejectedValue(new Error('Network error'));

    renderAuth();

    await act(async () => {
      const btn = document.querySelector('[data-testid="forgot-password-btn"]') as HTMLElement;
      btn.click();
    });

    await waitFor(() => {
      const result = document.querySelector('[data-testid="result"]');
      expect(result?.textContent).toBe('Error: Network error. Please try again.');
    });
  });

  it('should use default message when API response has no message', async () => {
    mockPublicPost.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    renderAuth();

    await act(async () => {
      const btn = document.querySelector('[data-testid="forgot-password-btn"]') as HTMLElement;
      btn.click();
    });

    await waitFor(() => {
      const result = document.querySelector('[data-testid="result"]');
      expect(result?.textContent).toContain('If your email is registered');
    });
  });
});
