import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  X,
  Plus,
  ChevronDown,
  Mail,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OAUTH_URLS } from '../config/environment';
import config from '../config/environment';
import AnimatedBackground from './AnimatedBackground';
import ForgotPasswordModal from './auth/ForgotPasswordModal';
import UsernameInput from './auth/UsernameInput';
import { usePricingData } from '../hooks/usePricingData';
import type { PricingPlan, PricingFaq } from '../hooks/usePricingData';
import BetaPhaseBanner from './shared/BetaPhaseBanner';
import ThumbnailResultModal from './ui/ThumbnailResultModal';
import { savePendingThumbnail, markGenerationInflight, clearGenerationInflight } from '../utils/pendingThumbnail';
import { authPost } from '../utils/api';
type ThumPiksLandingProps = Record<string, never>;
// Row 1: Top carousel thumbnails with bold text overlays
const thumbnailImagesRow1 = [
  '/images/thumbnails/thumbnail-gaming-1.png',
  '/images/thumbnails/thumbnail-tech-1.png',
  '/images/thumbnails/thumbnail-cooking-1.png',
  '/images/thumbnails/thumbnail-fitness-1.png',
  '/images/thumbnails/thumbnail-travel-1.png',
  '/images/thumbnails/thumbnail-education-1.png',
  '/images/thumbnails/thumbnail-music-1.png',
  '/images/thumbnails/thumbnail-lifestyle-1.png',
];

// Row 2: Bottom carousel thumbnails - different designs
const thumbnailImagesRow2 = [
  '/images/thumbnails/thumbnail-gaming-2.png',
  '/images/thumbnails/thumbnail-tech-2.png',
  '/images/thumbnails/thumbnail-cooking.png', // fallback since cooking-2 failed
  '/images/thumbnails/thumbnail-fitness-2.png',
  '/images/thumbnails/thumbnail-travel-2.png',
  '/images/thumbnails/thumbnail-education-2.png',
  '/images/thumbnails/thumbnail-music-2.png',
  '/images/thumbnails/thumbnail-lifestyle-2.png',
];

const PLATFORMS = [
  { name: 'YouTube', placeholder: 'Drop link to your YouTube video' },
  { name: 'TikTok', placeholder: 'Drop link to your TikTok video' },
  { name: 'Instagram', placeholder: 'Drop link to your Instagram Reel' },
  { name: 'Twitter', placeholder: 'Drop link to your Twitter post' },
];

// ---------------------------------------------------------------------------
// Helper: format a single feature value for display
// ---------------------------------------------------------------------------
function formatFeatureValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

interface PlatformTypingHeadlineProps {
  onPlatformChange: (index: number) => void;
}

const PlatformTypingHeadline: React.FC<PlatformTypingHeadlineProps> = memo(
  ({ onPlatformChange }) => {
    const [currentPlatformIndex, setCurrentPlatformIndex] = React.useState(0);
    const [displayedText, setDisplayedText] = React.useState('');
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);
    const [showCursor, setShowCursor] = React.useState(true);
    const currentPlatform = PLATFORMS[currentPlatformIndex];

    React.useEffect(() => {
      onPlatformChange(currentPlatformIndex);
    }, [currentPlatformIndex, onPlatformChange]);

    React.useEffect(() => {
      const typingSpeed = 150;
      const deletingSpeed = 75;
      const pauseAfterComplete = 2500;
      const pauseBeforeTyping = 400;

      const targetText = currentPlatform.name;

      if (isPaused) {
        const pauseTimer = setTimeout(() => {
          setIsPaused(false);
          setShowCursor(true);
        }, pauseBeforeTyping);
        return () => clearTimeout(pauseTimer);
      }

      const timer = setTimeout(() => {
        if (!isDeleting) {
          if (displayedText.length < targetText.length) {
            setDisplayedText(targetText.slice(0, displayedText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), pauseAfterComplete);
          }
        } else if (displayedText.length > 0) {
          setDisplayedText(displayedText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setShowCursor(false);
          setIsPaused(true);
          setCurrentPlatformIndex((prev) => (prev + 1) % PLATFORMS.length);
        }
      }, isDeleting ? deletingSpeed : typingSpeed);

      return () => clearTimeout(timer);
    }, [displayedText, isDeleting, isPaused, currentPlatform.name]);

    return (
      <>
        {displayedText}
        {showCursor && <span className="animate-pulse">|</span>}
      </>
    );
  }
);

// ---------------------------------------------------------------------------
// PricingCard sub-component
// ---------------------------------------------------------------------------
interface PricingCardProps {
  plan: PricingPlan;
  billingCycle: 'monthly' | 'annual';
  onCta: () => void;
}

function formatPrice(amount: number): { dollars: string; cents: string; hasCents: boolean } {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  return {
    dollars: dollars.toString(),
    cents: cents.toString().padStart(2, '0'),
    hasCents: cents > 0,
  };
}

const PricingCard: React.FC<PricingCardProps> = memo(({ plan, billingCycle, onCta }) => {
  const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  const originalPrice = billingCycle === 'monthly' ? plan.originalMonthlyPrice : plan.originalAnnualPrice;
  const showStrikethrough = plan.hasDiscount && originalPrice > price;
  const { dollars, cents, hasCents } = formatPrice(price);
  const discountPercent = showStrikethrough ? Math.round((1 - price / originalPrice) * 100) : 0;
  const isFree = plan.monthlyPrice === 0;

  const featureEntries = useMemo<Array<{ label: string; positive: boolean }>>(() => {
    const entries: Array<{ label: string; positive: boolean }> = [];

  // Thumbnails
  entries.push({
    label: `${plan.credits} AI thumbnail credits/month`,
    positive: true,
  });

  // Resolution
  if (plan.features.resolution) {
    entries.push({ label: `${plan.features.resolution} resolution`, positive: true });
  }

  // Watermark
  if (plan.features.watermark) {
    entries.push({
      label:
        plan.features.watermarkFreeExports === 1
          ? '1 watermark-free export/month'
          : 'Includes watermark',
      positive: plan.features.watermarkFreeExports === 1,
    });
  } else {
    entries.push({ label: 'No watermark', positive: true });
  }

  // Face swap
  if (plan.features.faceSwap !== undefined) {
    if (typeof plan.features.faceSwap === 'boolean') {
      entries.push({
        label: plan.features.faceSwap ? 'Face swap' : 'No face swap',
        positive: plan.features.faceSwap,
      });
    } else if (typeof plan.features.faceSwap === 'number') {
      entries.push({
        label:
          plan.features.faceSwap === -1
            ? 'Unlimited face swaps'
            : `Face swap (${plan.features.faceSwap}/month)`,
        positive: true,
      });
    }
  }

  // A/B Testing
  if (plan.features.abTesting !== undefined) {
    if (typeof plan.features.abTesting === 'boolean') {
      entries.push({
        label: plan.features.abTesting ? 'A/B testing (coming soon)' : 'No A/B testing',
        positive: plan.features.abTesting,
      });
    } else if (typeof plan.features.abTesting === 'number') {
      entries.push({
        label: `A/B testing · ${plan.features.abTesting} variants (coming soon)`,
        positive: true,
      });
    }
  }

  // Analytics
  if (plan.features.analytics !== undefined) {
    entries.push({
      label: plan.features.analytics
        ? 'Analytics & CTR tracking'
        : 'No analytics',
      positive: plan.features.analytics,
    });
  }

  // Brand Kit (coming soon for all paid plans) — matches dashboard PricingPage
  if (plan.monthlyPrice > 0) {
    entries.push({ label: 'Brand kit (coming soon)', positive: true });
  }

  // Support — same for all plans (honest, no fake tiers) — matches dashboard PricingPage
  entries.push({ label: 'Email support', positive: true });

  // Early access
  if (plan.features.earlyAccess !== undefined) {
    entries.push({
      label: 'Early access to new features',
      positive: Boolean(plan.features.earlyAccess),
    });
  }

  // Private mode
  if (plan.features.privateModeDefault !== undefined) {
    entries.push({
      label: 'All generations private',
      positive: Boolean(plan.features.privateModeDefault),
    });
  }

    return entries;
  }, [plan.features, plan.credits]);

  const cardClasses = plan.popular
    ? 'bg-gray-900/50 border-2 border-blue-600 rounded-2xl p-8 relative flex flex-col'
    : 'bg-gray-900/50 border border-gray-800 rounded-2xl p-8 flex flex-col';

  const ctaClasses = plan.popular
    ? 'w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors'
    : 'w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors';

  const ctaLabel = isFree ? 'Start Free' : 'Get Started';

  let subNote: string | null = null;
  if (isFree) {
    subNote = 'No credit card required';
  } else if (billingCycle === 'annual' && plan.annualSavings > 0) {
    subNote = `Save ${plan.annualSavings}% annually`;
  } else if (!isFree) {
    subNote = plan.popular ? '14-day free trial included' : '7-day free trial';
  }

  return (
    <div className={cardClasses}>
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-medium">
            MOST POPULAR
          </div>
        </div>
      )}

      <div className={`mb-6 ${plan.popular ? 'pt-6' : ''}`}>
        <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          {plan.name}
        </div>
        <div className="mb-2">
          <span className="text-5xl font-light">${dollars}</span>
          {hasCents && <sup className="text-xl font-light">{cents}</sup>}
          <span className="text-lg text-gray-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
        </div>
        {showStrikethrough && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-red-400 font-semibold">-{discountPercent}%</span>
            <span className="text-gray-500 line-through">${originalPrice}/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
        )}
        <div className="text-sm text-gray-400">{plan.description}</div>
      </div>

      <div className="space-y-4 flex-grow">
        {featureEntries.map((feat, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 text-sm ${
              feat.positive ? '' : 'text-gray-600'
            }`}
          >
            {feat.positive ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feat.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6">
        <button onClick={onCta} className={ctaClasses}>
          {ctaLabel}
        </button>
        {subNote && (
          <div className="text-center text-xs text-gray-500 mt-3">{subNote}</div>
        )}
      </div>
    </div>
  );
});

// @component: ThumPiksLanding
export const ThumPiksLanding = (_props: ThumPiksLandingProps) => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { phase, spotsLeft, spotsTotal, endsAt, plans, faqs, loading: pricingLoading, error: pricingError } = usePricingData();
  const hasBetaDiscount = phase && phase.discountPercentMonthly > 0;
  const annualSavingsPercent = useMemo(() => {
    const paid = plans.find(p => p.monthlyPrice > 0);
    if (!paid || paid.monthlyPrice === 0) return 25;
    const monthlyTotal = paid.monthlyPrice * 12;
    return Math.round((1 - paid.annualPrice / monthlyTotal) * 100);
  }, [plans]);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'annual'>(
    'monthly'
  );
  const [showSignup, setShowSignup] = React.useState(false);
  const [showSignin, setShowSignin] = React.useState(false);
  const [showForgotPassword, setShowForgotPassword] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [bgOpacity, setBgOpacity] = React.useState(0.6);
  const [bgEnabled, setBgEnabled] = React.useState(true);
  const [videoLink, setVideoLink] = React.useState('');
  const [includeFace, setIncludeFace] = React.useState(false);
  const [showFaceModal, setShowFaceModal] = React.useState(false);
  const [faceImage, setFaceImage] = React.useState<string | null>(null);

  // Thumbnail generation state
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = React.useState<{
    thumbnailUrl: string;
    thumbnailId?: string;
    videoTitle?: string;
  } | null>(null);
  const [showResultModal, setShowResultModal] = React.useState(false);
  const [generationError, setGenerationError] = React.useState<string | null>(null);
  const [pendingGeneration, setPendingGeneration] = React.useState(false);

  const [currentPlatformIndex, setCurrentPlatformIndex] = React.useState(0);
  const currentPlatform = PLATFORMS[currentPlatformIndex];
  const handlePlatformChange = useCallback((index: number) => {
    setCurrentPlatformIndex((prev) => (prev === index ? prev : index));
  }, []);

  // Sign up fields
  const [signupName, setSignupName] = React.useState('');
  const [signupUsername, setSignupUsername] = React.useState('');
  const [signupEmail, setSignupEmail] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');
  const [showSignupPassword, setShowSignupPassword] = React.useState(false);

  // Sign in fields
  const [signinIdentifier, setSigninIdentifier] = React.useState('');
  const [signinPassword, setSigninPassword] = React.useState('');
  const [showSigninPassword, setShowSigninPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  // Reviews from API
  interface LandingReview {
    id: string;
    rating: number;
    body: string;
    channelName: string | null;
    subscribers: string | null;
    niche: string | null;
    authorName: string;
    authorAvatar: string | null;
  }
  const [landingReviews, setLandingReviews] = useState<LandingReview[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/api/reviews/public?featured=true&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setLandingReviews(data.reviews || []);
        }
      } catch {
        // Silently fail — show placeholders
      }
    };
    fetchReviews();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate all fields
    if (!signupName || !signupUsername || !signupEmail || !signupPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const result = await auth.register(
        signupEmail,
        signupPassword,
        signupName,
        signupUsername
      );

      if (result.success) {
        setShowSignup(false);
        // If there's a pending generation, do it now
        if (pendingGeneration) {
          await handlePostAuthGeneration();
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!signinIdentifier || !signinPassword) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const result = await auth.login(signinIdentifier, signinPassword);

      if (result.success) {
        setShowSignin(false);
        // If there's a pending generation, do it now
        if (pendingGeneration) {
          await handlePostAuthGeneration();
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate thumbnail API call
  const generateThumbnailFromVideo = useCallback(async (videoUrl: string) => {
    // Duplicate-submission guard — prevent double-charging on rapid re-clicks
    if (!markGenerationInflight()) {
      console.warn('Generation already in progress, skipping duplicate request');
      return false;
    }

    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      const response = await authPost('/thumbnails/generate', {
        videoUrl,
        includeFace,
      }) as unknown as {
        success: boolean;
        thumbnailUrl?: string;
        thumbnailId?: string;
        thumbnail?: { title?: string };
        creditCost?: number;
        error?: string;
      };
      
      if (response.success && response.thumbnailUrl) {
        const thumbnailData = {
          thumbnailUrl: response.thumbnailUrl,
          thumbnailId: response.thumbnailId,
          videoTitle: response.thumbnail?.title,
        };
        
        setGeneratedThumbnail(thumbnailData);
        
        // Save to localStorage for persistence
        savePendingThumbnail({
          thumbnailUrl: response.thumbnailUrl,
          thumbnailId: response.thumbnailId,
          videoTitle: response.thumbnail?.title,
          videoUrl,
          creditCost: response.creditCost || 1,
        });
        
        setShowResultModal(true);
        return true;
      } else {
        setGenerationError(response.error || 'Failed to generate thumbnail');
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error during generation';
      setGenerationError(errorMsg);
      return false;
    } finally {
      setIsGenerating(false);
      clearGenerationInflight(); // Always release the in-flight lock
    }
  }, [includeFace]);

  const handleGenerateClick = async () => {
    if (!videoLink.trim()) {
      setError('Please enter a video link');
      return;
    }
    
    // Always store includeFace preference
    localStorage.setItem('pendingIncludeFace', includeFace.toString());
    
    if (videoLink) {
      localStorage.setItem('pendingVideoLink', videoLink);
    }

    const token = localStorage.getItem('token');
    if (token) {
      // User is logged in - generate immediately
      await generateThumbnailFromVideo(videoLink);
    } else {
      // User is not logged in - show signup, then generate after
      setPendingGeneration(true);
      setShowSignup(true);
    }
  };

  // Handle post-auth generation (after signup/signin)
  const handlePostAuthGeneration = useCallback(async () => {
    if (pendingGeneration && videoLink) {
      setPendingGeneration(false);
      await generateThumbnailFromVideo(videoLink);
    }
  }, [pendingGeneration, videoLink, generateThumbnailFromVideo]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Unified auth action: authenticated users bypass modals, others see signup
  const handleAuthAction = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    } else {
      setShowSignup(true);
    }
  }, [navigate, setShowSignup]);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToFAQ = () => {
    const faqSection = document.getElementById('faq');
    if (faqSection) {
      faqSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle ESC key to close modals
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSignup) setShowSignup(false);
        if (showSignin) setShowSignin(false);
        if (showForgotPassword) setShowForgotPassword(false);
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showSignup, showSignin, showForgotPassword, mobileMenuOpen]);

  // @return
  return (
    <>
      {/* Animated WebGL Background */}
      <AnimatedBackground opacity={bgOpacity} enabled={bgEnabled} />

      <div className="relative z-10 min-h-screen bg-transparent text-white overflow-x-hidden md:overflow-x-visible">
        {/* Desktop navigation */}
        <div className="hidden md:block fixed top-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-full px-6 py-3 border border-gray-800 flex items-center gap-6">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
            >
              <div className="w-6 h-6 bg-white rounded"></div>
              <span>ThumPiks</span>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-600/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">Beta</span>
            </button>

            <div className="flex items-center gap-6 text-sm">
              <button 
                onClick={() => navigate('/features')}
                className="hover:text-gray-300 transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => navigate('/compare')}
                className="hover:text-gray-300 transition-colors"
              >
                Compare
              </button>
              <button 
                onClick={() => navigate('/reviews')}
                className="hover:text-gray-300 transition-colors"
              >
                Reviews
              </button>
              <button
                onClick={scrollToPricing}
                className="hover:text-gray-300 transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => setShowSignin(true)}
                className="hover:text-gray-300 transition-colors"
              >
                Sign in
              </button>
              <button
                onClick={handleAuthAction}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-full transition-colors text-white"
              >
                Get Started →
              </button>
            </div>
          </div>
        </div>

        {/* Mobile header with logo and menu button */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800 safe-area-top">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2 font-bold text-base">
              <div className="w-5 h-5 bg-white rounded"></div>
              <span>ThumPiks</span>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-600/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded">Beta</span>
            </div>
            <button
              className="p-2 rounded-lg bg-gray-900/80 backdrop-blur-xl border border-gray-800 hover:bg-gray-800 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <section className="pt-32 pb-20 px-6">
          <div className="max-w-5xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gray-900/80 border border-blue-500/30 rounded-full px-4 py-2 mb-8 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">Beta</span>
              <span className="w-px h-3 bg-gray-700"></span>
              <span className="text-sm text-gray-300">Early Access — Limited Spots</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-6">
              Generate Stunning{' '}
              <br />
              <span className="text-blue-500">
                <PlatformTypingHeadline onPlatformChange={handlePlatformChange} />
              </span>
              <br />
              Thumbnails with AI
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
              Turn any video into a click magnet with thumbnails that grab
              attention and drive views. Our AI creates professional designs instantly—no
              design skills needed. Works for YouTube, TikTok, Instagram, Twitter, and more.
            </p>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 max-w-2xl mx-auto mb-12">
              <div className="flex gap-4 mb-6">
                <button 
                  className={`flex-1 px-4 py-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors ${
                    includeFace ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  onClick={() => setShowFaceModal(true)}
                  title="Add your face to the thumbnail"
                  aria-describedby="include-face-desc"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {faceImage ? 'Face added ✓' : 'Include face'}
                  </span>
                  <span id="include-face-desc" className="text-xs opacity-70 font-normal">
                    Put your face in the thumbnail
                  </span>
                </button>
                <button className="flex-1 bg-gray-800 text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                  See example
                </button>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 mb-6 flex items-center gap-3">
                <div className="w-5 h-5 text-gray-500">🔗</div>
                <input
                  type="text"
                  value={videoLink}
                  onChange={e => setVideoLink(e.target.value)}
                  placeholder={currentPlatform.placeholder}
                  className="flex-1 bg-transparent border-none outline-none !outline-none !ring-0 !border-none !shadow-none focus:!outline-none focus:!ring-0 focus:!border-none focus:!shadow-none text-gray-400 min-w-0 appearance-none"
                />
                <button className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                  <div className="w-4 h-4 bg-gray-600 rounded"></div>
                </button>
              </div>

              <button
                onClick={handleGenerateClick}
                className="w-full bg-white text-black py-4 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Generate Thumbnail
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-8">
              Discover amazing thumbnails by creators like you.
            </p>
          </div>

          <div className="relative overflow-hidden mb-6">
            <motion.div
              className="flex gap-6 [--carousel-distance:-800px] sm:[--carousel-distance:-1200px] md:[--carousel-distance:-1600px]"
              animate={{
                x: [0, 'var(--carousel-distance)'],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 30,
                  ease: 'linear',
                },
              }}
            >
              {[...thumbnailImagesRow1, ...thumbnailImagesRow1, ...thumbnailImagesRow1].map(
                (img, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-80 h-48 bg-gray-800 rounded-xl overflow-hidden"
                  >
                    <img
                      src={img}
                      alt="YouTube thumbnail gallery"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )
              )}
            </motion.div>
          </div>

          <div className="relative overflow-hidden">
            <motion.div
              className="flex gap-6 [--carousel-distance:-800px] sm:[--carousel-distance:-1200px] md:[--carousel-distance:-1600px]"
              animate={{
                x: ['var(--carousel-distance)', 0],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 30,
                  ease: 'linear',
                },
              }}
            >
              {[...thumbnailImagesRow2, ...thumbnailImagesRow2, ...thumbnailImagesRow2].map(
                (img, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-80 h-48 bg-gray-800 rounded-xl overflow-hidden"
                  >
                    <img
                      src={img}
                      alt="YouTube thumbnail gallery"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )
              )}
            </motion.div>
          </div>
        </section>

        {/* Testimonials/Reviews Section */}
        <section id="reviews" className="py-24 px-6 bg-gradient-to-b from-gray-900/50 to-transparent">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-light mb-4">
                {landingReviews.length > 0
                  ? <>Loved by <span className="text-blue-500">Creators</span></>
                  : <>Be the First to <span className="text-blue-500">Review</span></>}
              </h2>
              <p className="text-gray-400">
                {landingReviews.length > 0
                  ? 'Honest reviews from real ThumPiks creators'
                  : 'No reviews yet — your honest feedback could be the first one here'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {landingReviews.length > 0 ? (
                landingReviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                      {review.authorAvatar ? (
                        <img
                          src={review.authorAvatar}
                          alt={review.authorName}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center">
                          <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium">{review.authorName}</h4>
                        {review.channelName && (
                          <p className="text-sm text-gray-400">
                            {review.channelName}
                            {review.subscribers && ` • ${review.subscribers} subs`}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      "{review.body}"
                    </p>
                    <div className="flex gap-1 mt-4">
                      {[1,2,3,4,5].map(i => (
                        <span key={i} className={i <= review.rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Placeholder silhouette cards
                [...Array(3)].map((_, index) => (
                  <div key={index} className="bg-gray-900/30 border border-gray-800/50 border-dashed rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gray-800/50 flex items-center justify-center">
                        <svg className="w-7 h-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" /></svg>
                      </div>
                      <div>
                        <div className="h-3 bg-gray-800/50 rounded w-24 mb-2"></div>
                        <div className="h-2 bg-gray-800/50 rounded w-32"></div>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-3 bg-gray-800/40 rounded w-full"></div>
                      <div className="h-3 bg-gray-800/40 rounded w-5/6"></div>
                      <div className="h-3 bg-gray-800/40 rounded w-4/6"></div>
                    </div>
                    <div className="flex gap-1 mt-4">
                      {[1,2,3,4,5].map(i => <span key={i} className="text-gray-700">★</span>)}
                    </div>
                    {index === 0 && (
                      <p className="text-gray-500 text-xs italic mt-3 text-center">Your review could be here</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* View All / Write Review CTA */}
            <div className="text-center mt-12">
              <button
                onClick={() => navigate('/reviews')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-3 rounded-lg font-medium transition-colors"
              >
                {landingReviews.length > 0 ? 'View All Reviews' : 'Write the First Review'}
              </button>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-light mb-4">
                Start Designing with{' '}
                <span className="text-blue-500">ThumPiks Now</span>
              </h2>
              <p className="text-gray-400 text-lg">
                Fast and simple for creators.
                <br />
                Bring your ideas to life{' '}
                <span className="font-bold text-blue-500">today!</span>
              </p>
            </div>

            <div className="flex items-center justify-center mb-12">
              <div className="relative inline-flex bg-gray-900 rounded-full p-1 border border-gray-800">
                <div
                  className="absolute top-1 bottom-1 bg-blue-600 rounded-full transition-none"
                  style={{
                    left: billingCycle === 'monthly' ? 4 : '50%',
                    right: billingCycle === 'monthly' ? '50%' : 4,
                  }}
                />
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className="relative z-10 px-8 py-3 rounded-full text-sm font-medium flex items-center gap-1.5"
                  style={{ color: billingCycle === 'monthly' ? '#ffffff' : '#9ca3af' }}
                >
                  Monthly
                  {hasBetaDiscount && (
                    <span
                      className="text-sm font-bold"
                      style={{ color: billingCycle === 'monthly' ? '#22c55e' : '#60a5fa' }}
                    >
                      -{phase.discountPercentMonthly}%
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className="relative z-10 px-8 py-3 rounded-full text-sm font-medium flex items-center gap-1.5"
                  style={{ color: billingCycle === 'annual' ? '#ffffff' : '#9ca3af' }}
                >
                  Annual
                  <span
                    className="text-sm font-bold"
                    style={{ color: billingCycle === 'annual' ? '#22c55e' : '#60a5fa' }}
                  >
                    -{hasBetaDiscount ? phase.discountPercentAnnual : annualSavingsPercent}%
                  </span>
                </button>
              </div>
            </div>

            {pricingLoading && (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
                Loading pricing plans…
              </div>
            )}

            {pricingError && !pricingLoading && (
              <div className="text-center py-12 text-gray-400">
                <p className="mb-2">Unable to load pricing plans right now.</p>
                <p className="text-sm text-gray-500">Please refresh the page or check back shortly.</p>
              </div>
            )}

            {!pricingLoading && !pricingError && phase && (
              <BetaPhaseBanner
                phase={phase}
                spotsLeft={spotsLeft}
                spotsTotal={spotsTotal}
                endsAt={endsAt}
              />
            )}

            {!pricingLoading && !pricingError && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {plans.map((plan) => (
                  <PricingCard
                    key={plan.id}
                    plan={plan}
                    billingCycle={billingCycle}
                    onCta={handleAuthAction}
                  />
                ))}
              </div>
            )}

            <div className="text-center mt-6 mb-2">
              <button
                onClick={() => navigate('/dashboard/pricing')}
                className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-2 transition-colors"
              >
                View full pricing details
              </button>
            </div>

            <div className="text-center text-sm text-gray-500">
              Made in America
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-light mb-4">
                Frequently{' '}
                <span className="text-blue-500">Asked Questions</span>
              </h2>
              <p className="text-gray-400">
                You'll find all the answers below.
                <br />
                However, if there's anything else,{' '}
                <span className="text-blue-500 cursor-pointer">
                  click here
                </span>{' '}
                to get in contact.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq: PricingFaq, i: number) => (
                <div
                  key={i}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="font-medium">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-6 text-gray-400">{faq.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 sm:p-10 md:p-16 text-center">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-6">
                  Thumbnails That
                  <br />
                  <span className="text-blue-500">Actually Get Clicks</span>
                </h2>
                <p className="text-gray-400 text-lg mb-8">
                  Be among the first creators to try ThumPiks — early access is open now.
                  <br />
                  From YouTube to TikTok — thumbnails as fast as 3 seconds.
                </p>
                <button
                  onClick={handleAuthAction}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition-colors text-lg font-medium"
                >
                  Get My Free Thumbnails
                </button>
                <div className="mt-6 text-sm text-gray-500">
                  No credit card • 150 free credits + 1 watermark-free export/month
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-gray-800 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
              <div>
                <button
                  onClick={scrollToTop}
                  className="flex items-center gap-2 font-bold text-lg mb-6 hover:opacity-80 transition-opacity"
                >
                  <div className="w-6 h-6 bg-white rounded"></div>
                  <span>ThumPiks</span>
                </button>
              </div>

              <div>
                <h3 className="font-medium mb-4">Product</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li>
                    <button 
                      onClick={() => navigate('/features')}
                      className="hover:text-white transition-colors"
                    >
                      Features
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/compare')}
                      className="hover:text-white transition-colors"
                    >
                      Compare
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/reviews')}
                      className="hover:text-white transition-colors"
                    >
                      Reviews
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={scrollToPricing}
                      className="hover:text-white transition-colors"
                    >
                      Pricing
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={scrollToFAQ}
                      className="hover:text-white transition-colors"
                    >
                      FAQ
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-4">Resources</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li>
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="hover:text-white transition-colors"
                    >
                      Dashboard
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/changelog')}
                      className="hover:text-white transition-colors"
                    >
                      Changelog
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/contact')}
                      className="hover:text-white transition-colors"
                    >
                      Contact
                    </button>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-4">Legal</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li>
                    <button 
                      onClick={() => navigate('/terms')}
                      className="hover:text-white transition-colors"
                    >
                      Terms of Service
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/privacy')}
                      className="hover:text-white transition-colors"
                    >
                      Privacy Policy
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-6 pt-8 border-t border-gray-800 md:flex-row md:items-center md:justify-between md:gap-0">
              <div className="text-sm text-gray-500">© 2025 ThumPiks LLC</div>
              <div className="text-sm text-gray-500">
                Web Design/Development Crafted by Augment Required
              </div>
              <div className="text-sm text-gray-500">contact@thumPiks.com</div>
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417a9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>

        {showSignup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
            {/* Backdrop overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10"
              onClick={() => setShowSignup(false)}
            />

            {/* Modal content */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="w-full h-full md:h-auto md:max-w-md relative z-10"
            >
              <div className="bg-gray-900 border-0 md:border md:border-gray-800 rounded-none md:rounded-2xl p-6 md:p-8 shadow-2xl h-full md:h-auto overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded"></div>
                    <span className="font-bold text-lg">ThumPiks</span>
                  </div>
                  <button
                    onClick={() => setShowSignup(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-light mb-2">
                  Create your account
                </h2>
                <p className="text-gray-400 text-sm mb-8">
                  Join thousands of creators building with AI
                </p>

                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => {
                      // Store pending auth data before redirecting
                      const pendingVideoLink = localStorage.getItem('pendingVideoLink');
                      const pendingIncludeFace = localStorage.getItem('pendingIncludeFace');
                      if (pendingVideoLink) {
                        sessionStorage.setItem('pendingVideoLink', pendingVideoLink);
                      }
                      if (pendingIncludeFace) {
                        sessionStorage.setItem('pendingIncludeFace', pendingIncludeFace);
                      }
                      // Redirect to Google OAuth
                      window.location.href = OAUTH_URLS.google;
                    }}
                    className="w-full border border-gray-700 bg-gray-800/50 hover:bg-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors text-sm font-medium"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#4285f4"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#4285f4"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#4285f4"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-gray-900 text-gray-500">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={signupName}
                      onChange={e => setSignupName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Email address
                    </label>
                    <input
                      type="text"
                      name="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Username
                    </label>
                    <UsernameInput
                      value={signupUsername}
                      onChange={setSignupUsername}
                      fullName={signupName}
                      email={signupEmail}
                      className=""
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        name="password"
                        value={signupPassword}
                        onChange={e => setSignupPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowSignupPassword(!showSignupPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
                        aria-label={
                          showSignupPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showSignupPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
                      char
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating account...' : 'Create account'}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400">
                  Already have an account?{' '}
                  <span
                    onClick={() => {
                      setShowSignup(false);
                      setShowSignin(true);
                    }}
                    className="text-blue-500 cursor-pointer hover:text-blue-400"
                  >
                    Sign in
                  </span>
                </p>

                <p className="text-xs text-gray-500 text-center mt-6">
                  By signing up, you agree to our{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white underline transition-colors"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white underline transition-colors"
                  >
                    Privacy Policy
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {showSignin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4">
            {/* Backdrop overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10"
              onClick={() => setShowSignin(false)}
            />

            {/* Modal content */}
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="w-full h-full md:h-auto md:max-w-md relative z-10"
            >
              <div className="bg-gray-900 border-0 md:border md:border-gray-800 rounded-none md:rounded-2xl p-6 md:p-8 shadow-2xl h-full md:h-auto overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white rounded"></div>
                    <span className="font-bold text-lg">ThumPiks</span>
                  </div>
                  <button
                    onClick={() => setShowSignin(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h2 className="text-2xl font-light mb-2">Welcome back</h2>
                <p className="text-gray-400 text-sm mb-8">
                  Sign in to your ThumPiks account
                </p>

                <div className="space-y-4 mb-6">
                  <button 
                    onClick={() => {
                      window.location.href = OAUTH_URLS.google;
                    }}
                    className="w-full border border-gray-700 bg-gray-800/50 hover:bg-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors text-sm font-medium">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#4285f4"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#4285f4"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#4285f4"
                      />
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-gray-900 text-gray-500">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/50 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSignin} className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Username or Email
                    </label>
                    <input
                      type="text"
                      name="identifier"
                      value={signinIdentifier}
                      onChange={e => setSigninIdentifier(e.target.value)}
                      placeholder="username or email@example.com"
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                    />
                    {signinIdentifier && (
                      <p className="text-xs text-gray-500 mt-1">
                        {signinIdentifier.includes('@')
                          ? '📧 Logging in with email'
                          : '👤 Logging in with username'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showSigninPassword ? 'text' : 'password'}
                        name="password"
                        value={signinPassword}
                        onChange={e => setSigninPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowSigninPassword(!showSigninPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none"
                        aria-label={
                          showSigninPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showSigninPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 bg-gray-800 border border-gray-700 rounded"
                      />
                      <span className="text-gray-400">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignin(false);
                        setShowForgotPassword(true);
                      }}
                      className="text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>

                <p className="text-center text-xs text-gray-400">
                  Don't have an account?{' '}
                  <span
                    onClick={() => {
                      setShowSignin(false);
                      setShowSignup(true);
                    }}
                    className="text-blue-500 cursor-pointer hover:text-blue-400"
                  >
                    Sign up
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl md:hidden">
            <div className="flex flex-col h-full p-6">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-2 font-bold text-lg">
                  <div className="w-6 h-6 bg-white rounded"></div>
                  <span>ThumPiks</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-800"
                  aria-label="Close mobile menu"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="flex flex-col gap-6 flex-1">
                <button
                  className="text-left py-3 text-xl hover:text-gray-300 transition-colors"
                  onClick={() => {
                    navigate('/features');
                    setMobileMenuOpen(false);
                  }}
                >
                  Features
                </button>
                <button
                  className="text-left py-3 text-xl hover:text-gray-300 transition-colors"
                  onClick={() => {
                    navigate('/compare');
                    setMobileMenuOpen(false);
                  }}
                >
                  Compare
                </button>
                <button
                  className="text-left py-3 text-xl hover:text-gray-300 transition-colors"
                  onClick={() => {
                    navigate('/reviews');
                    setMobileMenuOpen(false);
                  }}
                >
                  Reviews
                </button>
                <button
                  className="text-left py-3 text-xl hover:text-gray-300 transition-colors"
                  onClick={() => {
                    scrollToPricing();
                    setMobileMenuOpen(false);
                  }}
                >
                  Pricing
                </button>
              </nav>

              <div className="flex flex-col gap-4 pt-8 border-t border-gray-800">
                <button
                  onClick={() => {
                    setShowSignin(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 text-center hover:text-gray-300 transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    handleAuthAction();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg transition-colors"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />

        {/* Face Selection Modal */}
        {showFaceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowFaceModal(false)}
            />
            <div className="relative bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-800">
              <button
                onClick={() => setShowFaceModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                aria-label="Close face modal"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-semibold text-white mb-2">Include Your Face</h3>
              <p className="text-gray-400 text-sm mb-6">
                Upload a clear photo of your face to include in your thumbnail. AI will swap your face onto the generated design.
              </p>

              {faceImage ? (
                <div className="relative mb-6">
                  <img 
                    src={faceImage} 
                    alt="Selected face" 
                    className="w-32 h-32 mx-auto rounded-full object-cover border-2 border-blue-500"
                  />
                  <button
                    onClick={() => {
                      setFaceImage(null);
                      setIncludeFace(false);
                    }}
                    className="absolute top-0 right-1/2 translate-x-16 -translate-y-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors"
                    aria-label="Remove face image"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="block mb-6">
                  <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-2">Click to upload your face</p>
                    <p className="text-gray-600 text-xs">PNG, JPG up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setFaceImage(event.target?.result as string);
                          setIncludeFace(true);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFaceModal(false)}
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowFaceModal(false);
                  }}
                  disabled={!faceImage}
                  className={`flex-1 px-4 py-3 rounded-lg transition-colors ${
                    faceImage 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {faceImage ? 'Confirm' : 'Upload to continue'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thumbnail Result Modal */}
        <ThumbnailResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setGeneratedThumbnail(null);
          }}
          thumbnailUrl={generatedThumbnail?.thumbnailUrl || ''}
          thumbnailId={generatedThumbnail?.thumbnailId}
          videoTitle={generatedThumbnail?.videoTitle}
          creditCost={1}
          onGenerateAnother={() => {
            setShowResultModal(false);
            setGeneratedThumbnail(null);
            // Scroll to top where the input is
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />

        {/* Generation Loading Overlay */}
        {isGenerating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0F172A] border border-slate-700 rounded-2xl p-8 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Creating Your Thumbnail</h3>
              <p className="text-sm text-slate-400">Analyzing video and generating...</p>
            </div>
          </div>
        )}

        {/* Generation Error Toast */}
        {generationError && (
          <div className="fixed bottom-4 right-4 z-50 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <X className="w-5 h-5" />
              <span className="text-sm">{generationError}</span>
            </div>
            <button 
              onClick={() => setGenerationError(null)}
              className="absolute top-1 right-1 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ThumPiksLanding;
