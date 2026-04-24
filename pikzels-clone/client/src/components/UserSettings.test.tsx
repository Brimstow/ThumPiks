import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import UserSettings from './UserSettings';

// Mock the fetch API
global.fetch = jest.fn();

describe('UserSettings', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'test-token');
  });

  it('renders loading state initially', () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ settings: {} }),
    });

    render(<UserSettings />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('fetches and displays user settings', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          settings: {
            theme: 'dark',
            language: 'en',
            notifications: {
              email: true,
              push: false,
            },
          },
        }),
    });

    render(<UserSettings />);

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check that the settings are displayed
    expect(screen.getByText('User Settings')).toBeInTheDocument();
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<UserSettings />);

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check that the error message is displayed
    expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
  });
});
