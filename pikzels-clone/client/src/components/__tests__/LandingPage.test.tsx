import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// --- Mock navigation ---
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// --- Mock AuthContext ---
const mockLogin = jest.fn();
const mockRegister = jest.fn();
jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => ({
    user: null,
    login: mockLogin,
    register: mockRegister,
    loading: false,
  }),
}));

// --- Mock child components ---
jest.mock('../AnimatedBackground', () => ({
  __esModule: true,
  default: function MockAnimatedBackground() {
    return <div data-testid="animated-background" />;
  },
}));

jest.mock('../auth/ForgotPasswordModal', () => ({
  __esModule: true,
  default: function MockForgotPasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
      <div data-testid="forgot-password-modal">
        <button onClick={onClose} data-testid="close-forgot-password">Close</button>
      </div>
    );
  },
}));

jest.mock('../auth/UsernameInput', () => ({
  __esModule: true,
  default: function MockUsernameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <input
        data-testid="username-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Username"
      />
    );
  },
}));

// --- Mock framer-motion ---
jest.mock('framer-motion', () => {
  const ReactActual = require('react');
  return {
    __esModule: true,
    motion: {
      div: ReactActual.forwardRef(({ children, animate, initial, exit, transition, style, ...props }: any, ref: any) => (
        <div ref={ref} style={style} {...props}>{children}</div>
      )),
      span: ReactActual.forwardRef(({ children, animate, transition, ...props }: any, ref: any) => (
        <span ref={ref} {...props}>{children}</span>
      )),
    },
    AnimatePresence: ({ children }: { children: any }) => <>{children}</>,
  };
});

// --- Mock lucide-react ---
jest.mock('lucide-react', () => ({
  __esModule: true,
  Sparkles: () => <span data-testid="icon-sparkles">Sparkles</span>,
  Check: () => <span data-testid="icon-check">Check</span>,
  X: ({ className, ...props }: any) => <span data-testid="icon-x" {...props}>X</span>,
  Plus: () => <span data-testid="icon-plus">Plus</span>,
  ChevronDown: ({ className }: any) => <span data-testid="icon-chevron" className={className}>ChevronDown</span>,
  Mail: () => <span data-testid="icon-mail">Mail</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  EyeOff: () => <span data-testid="icon-eyeoff">EyeOff</span>,
}));

// --- Mock usePricingData with current backend plan data ---
jest.mock('../../hooks/usePricingData', () => ({
  __esModule: true,
  usePricingData: () => ({
    phase: { id: 'production', name: 'Production', badge: '', discountPercentMonthly: 0, discountPercentAnnual: 0 },
    spotsLeft: null,
    spotsTotal: null,
    endsAt: null,
    plans: [
      {
        id: 'free', name: 'Free', description: 'Try before you subscribe',
        monthlyPrice: 0, annualPrice: 0, originalMonthlyPrice: 0, originalAnnualPrice: 0,
        hasDiscount: false, credits: 150, displayThumbnails: 5, popular: false, annualSavings: 0,
        features: { aiThumbnails: 150, resolution: '720p', watermark: true, watermarkFreeExports: 1, faceSwap: 3, abTesting: false, analytics: false, support: 'Community', frameExtractionsPerDay: 5, frameRegeneratesPerUrl: 1 },
      },
      {
        id: 'starter', name: 'Starter', description: 'Perfect for new creators',
        monthlyPrice: 19, annualPrice: 182, originalMonthlyPrice: 19, originalAnnualPrice: 182,
        hasDiscount: false, credits: 750, displayThumbnails: 50, popular: false, annualSavings: 20,
        features: { aiThumbnails: 750, resolution: '1080p HD', watermark: false, faceSwap: 20, abTesting: 2, analytics: true, support: 'Email', frameExtractionsPerDay: 20, frameRegeneratesPerUrl: 3 },
      },
      {
        id: 'pro', name: 'Creator Pro', description: 'For serious YouTubers',
        monthlyPrice: 39, annualPrice: 374, originalMonthlyPrice: 39, originalAnnualPrice: 374,
        hasDiscount: false, credits: 3000, displayThumbnails: 200, popular: true, annualSavings: 20,
        features: { aiThumbnails: 3000, resolution: '4K Ultra HD', watermark: false, faceSwap: 100, abTesting: true, analytics: true, support: 'Priority', customTemplates: true, earlyAccess: true, frameExtractionsPerDay: -1, frameRegeneratesPerUrl: -1 },
      },
      {
        id: 'ultra_pro', name: 'Ultra Pro', description: 'For power creators',
        monthlyPrice: 79, annualPrice: 758, originalMonthlyPrice: 79, originalAnnualPrice: 758,
        hasDiscount: false, credits: 9000, displayThumbnails: 600, popular: false, annualSavings: 20,
        features: { aiThumbnails: 9000, resolution: '4K Ultra HD', watermark: false, faceSwap: -1, abTesting: true, analytics: true, support: 'Dedicated', privateModeDefault: true, earlyAccess: true, customTemplates: true, frameExtractionsPerDay: -1, frameRegeneratesPerUrl: -1 },
      },
    ],
    creditPacks: [],
    faqs: [
      { question: 'What happens when I run out of thumbnails?', answer: "You can purchase additional credit packs or upgrade your plan anytime. Your unused credits don't roll over to the next month." },
      { question: 'Do monthly thumbnails roll over?', answer: "No, thumbnail credits reset each month on your billing date. Unused credits don't carry over." },
      { question: 'Can I cancel anytime?', answer: "Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period." },
      { question: 'Do you offer refunds?', answer: 'We offer a 7-day money-back guarantee for annual plans. Monthly plans can be cancelled anytime but are non-refundable.' },
      { question: 'Can I change my plan?', answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
      { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, debit cards, and PayPal through our secure payment processor.' },
      { question: 'Is there a free trial?', answer: 'Our Free plan gives you 150 AI thumbnail credits per month plus 1 watermark-free export — no credit card required. All paid plans include a 7-day free trial.' },
      { question: "What's the difference between monthly and annual billing?", answer: "Annual billing saves you up to 20% compared to monthly billing. You're billed once per year." },
      { question: 'How do credit packs work?', answer: "Credit packs are one-time purchases that add extra credits to your account. They don't expire and can be used anytime." },
      { question: 'What AI tools are included?', answer: 'All plans include access to our core AI thumbnail generation tools. Higher tiers unlock advanced features like face swap, A/B testing, and analytics.' },
      { question: 'Do you offer team or enterprise plans?', answer: "We're working on team plans! Contact us at support@thumpiks.com for enterprise inquiries." },
    ],
    loading: false,
    error: null,
  }),
  prefetchPricingData: jest.fn(),
}));

// --- Mock BetaPhaseBanner ---
jest.mock('../shared/BetaPhaseBanner', () => ({
  __esModule: true,
  default: function MockBetaPhaseBanner() {
    return <div data-testid="beta-phase-banner" />;
  },
}));

import { ThumPiksLanding } from '../ThumPiksLanding';

const renderLanding = () =>
  render(
    <MemoryRouter>
      <ThumPiksLanding />
    </MemoryRouter>
  );

// ============================================
// FUNCTIONAL TESTS
// ============================================

describe('ThumPiksLanding - Functional Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- Hero Section ---
  describe('Hero Section', () => {
    it('renders the main heading', () => {
      renderLanding();
      expect(screen.getByText(/Generate Stunning/)).toBeInTheDocument();
      expect(screen.getByText(/Thumbnails with AI/)).toBeInTheDocument();
    });

    it('renders the beta badge', () => {
      renderLanding();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText(/Early Access/)).toBeInTheDocument();
    });

    it('renders the subtitle describing the product', () => {
      renderLanding();
      expect(screen.getByText(/Turn any video into a click magnet/)).toBeInTheDocument();
    });

    it('renders the video link input field', () => {
      renderLanding();
      const input = screen.getByPlaceholderText(/Drop link to your/);
      expect(input).toBeInTheDocument();
    });

    it('renders the Generate Thumbnail button', () => {
      renderLanding();
      expect(screen.getByText('Generate Thumbnail')).toBeInTheDocument();
    });

    it('renders the Include face button', () => {
      renderLanding();
      expect(screen.getByText('Include face')).toBeInTheDocument();
    });

    it('renders See example button', () => {
      renderLanding();
      expect(screen.getByText('See example')).toBeInTheDocument();
    });

    it('renders thumbnail carousel images', () => {
      renderLanding();
      const images = screen.getAllByRole('img', { name: 'YouTube thumbnail gallery' });
      expect(images.length).toBeGreaterThan(0);
    });
  });

  // --- Desktop Navigation ---
  describe('Desktop Navigation', () => {
    it('renders brand name ThumPiks in nav', () => {
      renderLanding();
      const brandElements = screen.getAllByText('ThumPiks');
      expect(brandElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Features nav link', () => {
      renderLanding();
      const featuresButtons = screen.getAllByText('Features');
      expect(featuresButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('navigates to /features when Features is clicked', () => {
      renderLanding();
      const featuresButtons = screen.getAllByText('Features');
      fireEvent.click(featuresButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/features');
    });

    it('renders Reviews nav link', () => {
      renderLanding();
      const reviewsButtons = screen.getAllByText('Reviews');
      expect(reviewsButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('navigates to /reviews when Reviews is clicked', () => {
      renderLanding();
      const reviewsButtons = screen.getAllByText('Reviews');
      fireEvent.click(reviewsButtons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/reviews');
    });

    it('renders Pricing nav link', () => {
      renderLanding();
      const pricingButtons = screen.getAllByText('Pricing');
      expect(pricingButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Sign in nav link', () => {
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      expect(signinButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('renders Get Started button', () => {
      renderLanding();
      const getStarted = screen.getAllByText(/Get Started/);
      expect(getStarted.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Pricing Section ---
  describe('Pricing Section', () => {
    it('renders the pricing heading', () => {
      renderLanding();
      expect(screen.getByText(/Start Designing with/)).toBeInTheDocument();
      expect(screen.getByText('ThumPiks Now')).toBeInTheDocument();
    });

    it('renders all four pricing tiers', () => {
      renderLanding();
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Starter')).toBeInTheDocument();
      expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    });

    it('renders Monthly billing toggle', () => {
      renderLanding();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
    });

    it('renders Annual billing toggle with discount', () => {
      renderLanding();
      expect(screen.getByText('Annual')).toBeInTheDocument();
      expect(screen.getByText('-20%')).toBeInTheDocument();
    });

    it('shows monthly price by default ($19 for Starter)', () => {
      renderLanding();
      expect(screen.getByText(/\$19/)).toBeInTheDocument();
    });

    it('shows annual price when annual toggle is clicked', () => {
      renderLanding();
      fireEvent.click(screen.getByText('Annual'));
      expect(screen.getByText(/\$182/)).toBeInTheDocument();
    });

    it('renders free tier features', () => {
      renderLanding();
      expect(screen.getByText('150 AI thumbnail credits/month')).toBeInTheDocument();
      expect(screen.getByText('720p')).toBeInTheDocument();
    });

    it('renders Start Free CTA button', () => {
      renderLanding();
      expect(screen.getByText('Start Free')).toBeInTheDocument();
    });

    it('renders No credit card required text', () => {
      renderLanding();
      const noCCTexts = screen.getAllByText(/No credit card/);
      expect(noCCTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- FAQ Section ---
  describe('FAQ Section', () => {
    it('renders the FAQ heading', () => {
      renderLanding();
      expect(screen.getByText(/Frequently/)).toBeInTheDocument();
      expect(screen.getByText('Asked Questions')).toBeInTheDocument();
    });

    it('renders FAQ questions from pricing API', () => {
      renderLanding();
      expect(screen.getByText('What happens when I run out of thumbnails?')).toBeInTheDocument();
      expect(screen.getByText('Do monthly thumbnails roll over?')).toBeInTheDocument();
      expect(screen.getByText('Can I cancel anytime?')).toBeInTheDocument();
      expect(screen.getByText('Do you offer refunds?')).toBeInTheDocument();
      expect(screen.getByText('Can I change my plan?')).toBeInTheDocument();
      expect(screen.getByText('What payment methods do you accept?')).toBeInTheDocument();
      expect(screen.getByText('Is there a free trial?')).toBeInTheDocument();
    });

    it('expands FAQ answer when question is clicked', () => {
      renderLanding();
      const firstQuestion = screen.getByText('What happens when I run out of thumbnails?');
      fireEvent.click(firstQuestion);
      expect(screen.getByText(/You can purchase additional credit packs/)).toBeInTheDocument();
    });

    it('collapses FAQ answer when clicked again', () => {
      renderLanding();
      const firstQuestion = screen.getByText('What happens when I run out of thumbnails?');
      fireEvent.click(firstQuestion);
      expect(screen.getByText(/You can purchase additional credit packs/)).toBeInTheDocument();
      fireEvent.click(firstQuestion);
      expect(screen.queryByText(/You can purchase additional credit packs/)).not.toBeInTheDocument();
    });

    it('closes previous FAQ when a different question is clicked', () => {
      renderLanding();
      const firstQuestion = screen.getByText('What happens when I run out of thumbnails?');
      const secondQuestion = screen.getByText('Do monthly thumbnails roll over?');

      fireEvent.click(firstQuestion);
      expect(screen.getByText(/You can purchase additional credit packs/)).toBeInTheDocument();

      fireEvent.click(secondQuestion);
      expect(screen.queryByText(/You can purchase additional credit packs/)).not.toBeInTheDocument();
      expect(screen.getByText(/thumbnail credits reset each month/)).toBeInTheDocument();
    });
  });

  // --- Reviews Section ---
  describe('Reviews Section', () => {
    it('renders the reviews heading', () => {
      renderLanding();
      expect(screen.getByText(/Loved by/)).toBeInTheDocument();
      expect(screen.getByText('Creators')).toBeInTheDocument();
    });

    it('renders testimonial authors', () => {
      renderLanding();
      expect(screen.getByText('Alex Chen')).toBeInTheDocument();
    });

    it('renders star ratings', () => {
      renderLanding();
      const stars = screen.getAllByText('\u2605');
      expect(stars.length).toBeGreaterThanOrEqual(5);
    });
  });

  // --- CTA Section ---
  describe('CTA Section', () => {
    it('renders the final CTA heading', () => {
      renderLanding();
      expect(screen.getByText('Actually Get Clicks')).toBeInTheDocument();
    });

    it('renders Get My Free Thumbnails button', () => {
      renderLanding();
      expect(screen.getByText('Get My Free Thumbnails')).toBeInTheDocument();
    });
  });

  // --- Footer ---
  describe('Footer', () => {
    it('renders the footer copyright', () => {
      renderLanding();
      expect(screen.getByText(/\u00a9 2025 ThumPiks LLC/)).toBeInTheDocument();
    });

    it('renders footer Product column links', () => {
      renderLanding();
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('FAQ')).toBeInTheDocument();
    });

    it('renders footer Resources column links', () => {
      renderLanding();
      expect(screen.getByText('Resources')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Changelog')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('renders footer Legal column links', () => {
      renderLanding();
      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('navigates to /terms when Terms of Service is clicked', () => {
      renderLanding();
      fireEvent.click(screen.getByText('Terms of Service'));
      expect(mockNavigate).toHaveBeenCalledWith('/terms');
    });

    it('navigates to /privacy when Privacy Policy is clicked', () => {
      renderLanding();
      fireEvent.click(screen.getByText('Privacy Policy'));
      expect(mockNavigate).toHaveBeenCalledWith('/privacy');
    });

    it('navigates to /changelog when Changelog is clicked', () => {
      renderLanding();
      fireEvent.click(screen.getByText('Changelog'));
      expect(mockNavigate).toHaveBeenCalledWith('/changelog');
    });

    it('navigates to /contact when Contact is clicked', () => {
      renderLanding();
      fireEvent.click(screen.getByText('Contact'));
      expect(mockNavigate).toHaveBeenCalledWith('/contact');
    });

    it('renders contact email', () => {
      renderLanding();
      expect(screen.getByText('contact@thumPiks.com')).toBeInTheDocument();
    });
  });

  // --- Video Link Input ---
  describe('Video Link Input', () => {
    it('accepts user input', () => {
      renderLanding();
      const input = screen.getByPlaceholderText(/Drop link to your/);
      fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=abc123' } });
      expect(input).toHaveValue('https://youtube.com/watch?v=abc123');
    });
  });

  // --- Generate Thumbnail Flow ---
  describe('Generate Thumbnail Flow', () => {
    it('opens signup modal when user is not authenticated', () => {
      localStorage.removeItem('token');
      renderLanding();
      fireEvent.click(screen.getByText('Generate Thumbnail'));
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });

    it('navigates to /dashboard when user has a token', () => {
      localStorage.setItem('token', 'test-jwt-token');
      renderLanding();
      fireEvent.click(screen.getByText('Generate Thumbnail'));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('stores video link to localStorage before navigating', () => {
      localStorage.setItem('token', 'test-jwt-token');
      renderLanding();
      const input = screen.getByPlaceholderText(/Drop link to your/);
      fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=test' } });
      fireEvent.click(screen.getByText('Generate Thumbnail'));
      expect(localStorage.getItem('pendingVideoLink')).toBe('https://youtube.com/watch?v=test');
    });

    it('stores includeFace preference to localStorage', () => {
      localStorage.setItem('token', 'test-jwt-token');
      renderLanding();
      fireEvent.click(screen.getByText('Generate Thumbnail'));
      expect(localStorage.getItem('pendingIncludeFace')).toBe('false');
    });
  });
});

// ============================================
// AUTH MODAL TESTS (Functional + Security)
// ============================================

describe('ThumPiksLanding - Auth Modals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- Signup Modal ---
  describe('Signup Modal', () => {
    const openSignupModal = () => {
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);
    };

    it('opens when Get Started is clicked (unauthenticated)', () => {
      openSignupModal();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });

    it('renders all signup form fields', () => {
      openSignupModal();
      expect(screen.getByPlaceholderText('John Smith')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByTestId('username-input')).toBeInTheDocument();
    });

    it('renders Google sign up button', () => {
      openSignupModal();
      expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
    });

    it('renders password requirements text', () => {
      openSignupModal();
      expect(screen.getByText(/Min 8 chars/)).toBeInTheDocument();
    });

    it('closes when backdrop is clicked', () => {
      openSignupModal();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      const backdrop = screen.getByText('Create your account').closest('.fixed')?.querySelector('.absolute');
      if (backdrop) fireEvent.click(backdrop);
      expect(screen.queryByText('Create your account')).not.toBeInTheDocument();
    });

    it('shows link to switch to Sign In modal', () => {
      openSignupModal();
      expect(screen.getByText(/Already have an account/)).toBeInTheDocument();
    });

    it('renders Terms and Privacy policy agreement text', () => {
      openSignupModal();
      expect(screen.getByText(/By signing up, you agree to our/)).toBeInTheDocument();
    });

    it('uses AuthContext register method, not direct fetch', async () => {
      mockRegister.mockResolvedValue({ success: true });
      openSignupModal();

      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'testuser' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Secure123!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });

      expect(mockRegister).toHaveBeenCalledWith(
        'test@example.com',
        'Secure123!',
        'Test User',
        'testuser'
      );
    });

    it('navigates to /dashboard on successful registration', async () => {
      mockRegister.mockResolvedValue({ success: true });
      openSignupModal();

      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'testuser' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Secure123!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  // --- Signin Modal ---
  describe('Signin Modal', () => {
    const openSigninModal = () => {
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);
    };

    it('opens when Sign in nav button is clicked', () => {
      openSigninModal();
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    it('renders identifier and password fields', () => {
      openSigninModal();
      expect(screen.getByPlaceholderText('username or email@example.com')).toBeInTheDocument();
    });

    it('renders Google sign in button', () => {
      openSigninModal();
      expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    });

    it('renders Remember me checkbox', () => {
      openSigninModal();
      expect(screen.getByText('Remember me')).toBeInTheDocument();
    });

    it('renders Forgot password link', () => {
      openSigninModal();
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    it('uses AuthContext login method, not direct fetch', async () => {
      mockLogin.mockResolvedValue({ success: true });
      openSigninModal();

      fireEvent.change(screen.getByPlaceholderText('username or email@example.com'), {
        target: { value: 'testuser' },
      });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'MyPassword1!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Sign in', { selector: 'button[type="submit"]' }));
      });

      expect(mockLogin).toHaveBeenCalledWith('testuser', 'MyPassword1!');
    });

    it('shows link to switch to Sign Up modal', () => {
      openSigninModal();
      expect(screen.getByText(/Don't have an account/)).toBeInTheDocument();
    });
  });

  // --- ESC Key Handling ---
  describe('ESC Key Handling', () => {
    it('closes signup modal on Escape key', () => {
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);
      expect(screen.getByText('Create your account')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByText('Create your account')).not.toBeInTheDocument();
    });

    it('closes signin modal on Escape key', () => {
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);
      expect(screen.getByText('Welcome back')).toBeInTheDocument();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// SECURITY TESTS
// ============================================

describe('ThumPiksLanding - Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Input Validation', () => {
    const openSignupAndFill = () => {
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);
    };

    it('rejects signup with empty fields', async () => {
      openSignupAndFill();
      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('rejects invalid email format', async () => {
      openSignupAndFill();
      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'not-an-email' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'test' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Secure123!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('rejects password shorter than 8 characters', async () => {
      openSignupAndFill();
      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'Test' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@test.com' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'testuser' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Short1!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });
      expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('rejects signin with empty fields', async () => {
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);

      await act(async () => {
        fireEvent.click(screen.getByText('Sign in', { selector: 'button[type="submit"]' }));
      });
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Auth Enforcement (AuthContext-Only)', () => {
    it('signup handler calls auth.register, never direct fetch', async () => {
      mockRegister.mockResolvedValue({ success: true });
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);

      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'u@e.com' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'user1' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });
      expect(mockRegister).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      delete (global as any).fetch;
    });

    it('signin handler calls auth.login, never direct fetch', async () => {
      mockLogin.mockResolvedValue({ success: true });
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);

      fireEvent.change(screen.getByPlaceholderText('username or email@example.com'), {
        target: { value: 'user@test.com' },
      });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      await act(async () => {
        fireEvent.click(screen.getByText('Sign in', { selector: 'button[type="submit"]' }));
      });
      expect(mockLogin).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      delete (global as any).fetch;
    });
  });

  describe('Error Handling', () => {
    it('displays registration error from auth service', async () => {
      mockRegister.mockResolvedValue({ success: false, error: 'Email already registered' });
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);

      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'dup@test.com' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'user1' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });

    it('displays login error from auth service', async () => {
      mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);

      fireEvent.change(screen.getByPlaceholderText('username or email@example.com'), {
        target: { value: 'user@test.com' },
      });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'WrongPass1!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Sign in', { selector: 'button[type="submit"]' }));
      });
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    it('shows network error on register exception', async () => {
      mockRegister.mockRejectedValue(new Error('Network failure'));
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);

      fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'User' } });
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'u@test.com' } });
      fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'user1' } });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Create account'));
      });
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });

    it('shows network error on login exception', async () => {
      mockLogin.mockRejectedValue(new Error('Network failure'));
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);

      fireEvent.change(screen.getByPlaceholderText('username or email@example.com'), {
        target: { value: 'user@test.com' },
      });
      const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
      fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

      await act(async () => {
        fireEvent.click(screen.getByText('Sign in', { selector: 'button[type="submit"]' }));
      });
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('signup password toggle has proper aria-label', () => {
      renderLanding();
      const getStartedButtons = screen.getAllByText(/Get Started/);
      fireEvent.click(getStartedButtons[0]);
      expect(screen.getByLabelText('Show password')).toBeInTheDocument();
    });

    it('signin password toggle has proper aria-label', () => {
      renderLanding();
      const signinButtons = screen.getAllByText('Sign in');
      fireEvent.click(signinButtons[0]);
      expect(screen.getByLabelText('Show password')).toBeInTheDocument();
    });
  });
});

// ============================================
// DEBUG & EXPORT TESTS
// ============================================

describe('ThumPiksLanding - Debug & Export Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exports ThumPiksLanding as named export', () => {
    expect(ThumPiksLanding).toBeDefined();
    expect(typeof ThumPiksLanding).toBe('function');
  });

  it('exports ThumPiksLanding as default export', () => {
    const defaultExport = require('../ThumPiksLanding').default;
    expect(defaultExport).toBeDefined();
    expect(defaultExport).toBe(ThumPiksLanding);
  });

  it('renders AnimatedBackground child component', () => {
    renderLanding();
    expect(screen.getByTestId('animated-background')).toBeInTheDocument();
  });

  it('renders without crashing when auth returns null user', () => {
    expect(() => renderLanding()).not.toThrow();
  });

  it('submit button shows loading state during signup', async () => {
    // never-resolving promise simulates in-flight request
    mockRegister.mockImplementation(() => new Promise(() => {}));
    renderLanding();
    const getStartedButtons = screen.getAllByText(/Get Started/);
    fireEvent.click(getStartedButtons[0]);

    fireEvent.change(screen.getByPlaceholderText('John Smith'), { target: { value: 'User' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'u@t.com' } });
    fireEvent.change(screen.getByTestId('username-input'), { target: { value: 'user' } });
    const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Create account'));
    });
    expect(screen.getByText('Creating account...')).toBeInTheDocument();
  });

  it('submit button shows loading state during signin', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {}));
    renderLanding();
    const signinButtons = screen.getAllByText('Sign in');
    fireEvent.click(signinButtons[0]);

    fireEvent.change(screen.getByPlaceholderText('username or email@example.com'), {
      target: { value: 'user@test.com' },
    });
    const passwordInputs = screen.getAllByPlaceholderText('\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password1!' } });

    await act(async () => {
      fireEvent.click(screen.getByText('Sign in', { selector: 'button[type="submit"]' }));
    });
    expect(screen.getByText('Signing in...')).toBeInTheDocument();
  });
});
