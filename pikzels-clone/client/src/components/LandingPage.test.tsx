import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('LandingPage', () => {
  beforeEach(() => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
  });

  test('renders the main heading', () => {
    const heading = screen.getByText('Create Stunning Thumbnails in Seconds');
    expect(heading).toBeInTheDocument();
  });

  test('renders the description', () => {
    const description = screen.getByText(
      /Transform your content with AI-powered thumbnail generation/i
    );
    expect(description).toBeInTheDocument();
  });

  test('renders the get started button', () => {
    const getStartedButton = screen.getByRole('button', {
      name: /Get Started Free/i,
    });
    expect(getStartedButton).toBeInTheDocument();
  });

  test('renders the sign in button', () => {
    const signInButton = screen.getByRole('button', { name: /Sign In/i });
    expect(signInButton).toBeInTheDocument();
  });

  test('renders feature highlights', () => {
    expect(screen.getByText('AI-Powered Design')).toBeInTheDocument();
    expect(screen.getByText('Easy to Use')).toBeInTheDocument();
    expect(screen.getByText('Lightning Fast')).toBeInTheDocument();
  });

  test('renders testimonials section', () => {
    expect(screen.getByText(/What Creators Say/i)).toBeInTheDocument();
    expect(
      screen.getByText(/increased my YouTube click-through rate by 40%/i)
    ).toBeInTheDocument();
  });

  test('renders the footer with current year', () => {
    const currentYear = new Date().getFullYear();
    const footer = screen.getByText(new RegExp(currentYear.toString()));
    expect(footer).toBeInTheDocument();
  });
});
