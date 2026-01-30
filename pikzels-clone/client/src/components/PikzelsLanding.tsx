import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AnimatedBackground from './AnimatedBackground';
import ForgotPasswordModal from './auth/ForgotPasswordModal';
import UsernameInput from './auth/UsernameInput';
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

// @component: ThumPiksLanding
export const ThumPiksLanding = (_props: ThumPiksLandingProps) => {
  const navigate = useNavigate();
  const auth = useAuth();
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

  // Platform typing animation state
  const [currentPlatformIndex, setCurrentPlatformIndex] = React.useState(0);
  const [displayedText, setDisplayedText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [showCursor, setShowCursor] = React.useState(true);
  
  const platforms = [
    { name: 'YouTube', placeholder: 'Drop link to your YouTube video' },
    { name: 'TikTok', placeholder: 'Drop link to your TikTok video' },
    { name: 'Instagram', placeholder: 'Drop link to your Instagram Reel' },
    { name: 'Twitter', placeholder: 'Drop link to your Twitter post' },
  ];
  
  const currentPlatform = platforms[currentPlatformIndex];

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
        navigate('/dashboard');
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
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = () => {
    // Always store includeFace preference
    localStorage.setItem('pendingIncludeFace', includeFace.toString());
    
    if (videoLink) {
      localStorage.setItem('pendingVideoLink', videoLink);
    }

    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    } else {
      setShowSignup(true);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Unified auth action: authenticated users bypass modals, others see signup
  const handleAuthAction = () => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    } else {
      setShowSignup(true);
    }
  };

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

  // Platform typing animation effect
  React.useEffect(() => {
    const typingSpeed = 150; // ms per character (slower for readability)
    const deletingSpeed = 75; // faster deletion
    const pauseAfterComplete = 2500; // pause at full word
    const pauseBeforeTyping = 400; // brief pause before starting new word (cursor hidden)
    
    const targetText = currentPlatform.name;
    
    // Handle the brief pause state (cursor hidden)
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setShowCursor(true);
      }, pauseBeforeTyping);
      return () => clearTimeout(pauseTimer);
    }
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing forward
        if (displayedText.length < targetText.length) {
          setDisplayedText(targetText.slice(0, displayedText.length + 1));
        } else {
          // Finished typing, pause then start deleting
          setTimeout(() => setIsDeleting(true), pauseAfterComplete);
        }
      } else {
        // Deleting backward
        if (displayedText.length > 0) {
          setDisplayedText(displayedText.slice(0, -1));
        } else {
          // Finished deleting, hide cursor briefly, then move to next platform
          setIsDeleting(false);
          setShowCursor(false);
          setIsPaused(true);
          setCurrentPlatformIndex((prev) => (prev + 1) % platforms.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, isPaused, currentPlatformIndex, currentPlatform.name, platforms.length]);

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
            </button>

            <div className="flex items-center gap-6 text-sm">
              <button 
                onClick={() => navigate('/features')}
                className="hover:text-gray-300 transition-colors"
              >
                Features
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
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-gray-800">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2 font-bold text-base">
              <div className="w-5 h-5 bg-white rounded"></div>
              <span>ThumPiks</span>
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
            <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm">ThumPiks v1.0 Preview</span>
            </div>
            <h1 className="text-7xl font-light mb-6">
              Generate Stunning{' '}
              <br />
              <span className="text-blue-500">
                {displayedText}
                {showCursor && <span className="animate-pulse">|</span>}
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
                  className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    includeFace ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  onClick={() => setShowFaceModal(true)}
                >
                  <Plus className="w-4 h-4" />
                  {faceImage ? 'Face added ✓' : 'Include face'}
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
              className="flex gap-6"
              animate={{
                x: [0, -1600],
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
              className="flex gap-6"
              animate={{
                x: [-1600, 0],
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
                Loved by <span className="text-blue-500">Creators</span>
              </h2>
              <p className="text-gray-400">
                See what YouTubers are saying about ThumPiks
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="/images/testimonials/person1.png"
                    alt="Creator testimonial"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">Alex Chen</h4>
                    <p className="text-sm text-gray-400">Gaming Channel • 250K subs</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  "My CTR went from 4% to 12% after switching to ThumPiks. The AI understands what makes gaming thumbnails pop. Absolute game changer!"
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="/images/testimonials/person2.png"
                    alt="Creator testimonial"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">Sarah Mitchell</h4>
                    <p className="text-sm text-gray-400">Lifestyle Vlogger • 180K subs</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  "I used to spend 2 hours on each thumbnail. Now it takes 30 seconds. ThumPiks literally gave me my weekends back. 10/10 recommend!"
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="/images/testimonials/person3.png"
                    alt="Creator testimonial"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">Marcus Johnson</h4>
                    <p className="text-sm text-gray-400">Tech Reviews • 500K subs</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  "The face swap feature is insane. I can test different expressions without reshooting. This is the future of thumbnail creation."
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
              </div>

              {/* Testimonial 4 */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="/images/testimonials/person4.png"
                    alt="Creator testimonial"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">Emily Rodriguez</h4>
                    <p className="text-sm text-gray-400">Cooking Channel • 320K subs</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  "Finally, thumbnails that make my food look as good as it tastes! The AI knows exactly how to make dishes look mouthwatering."
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
              </div>

              {/* Testimonial 5 */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 md:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src="/images/testimonials/person5.png"
                    alt="Creator testimonial"
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">David Park</h4>
                    <p className="text-sm text-gray-400">Education • 1.2M subs</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  "As a solo creator, I can't afford a design team. ThumPiks is like having a professional designer on demand. Worth every penny."
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400">★</span>)}
                </div>
              </div>
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
              <div className="flex items-center gap-0 bg-gray-900 border border-gray-800 rounded-full px-1 py-1 relative w-fit">
                <motion.div
                  className="absolute top-1 bottom-1 bg-blue-600 rounded-full"
                  animate={{
                    x: billingCycle === 'monthly' ? 0 : 'calc(100% + 8px)',
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                  style={{
                    width: 'calc(50% - 4px)',
                  }}
                />

                <button
                  onClick={() => setBillingCycle('monthly')}
                  className="relative z-10 px-8 py-3 text-sm font-medium transition-colors"
                >
                  <motion.span
                    animate={{
                      color: billingCycle === 'monthly' ? '#ffffff' : '#9ca3af',
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    Monthly
                  </motion.span>
                </button>

                <button
                  onClick={() => setBillingCycle('annual')}
                  className="relative z-10 px-8 py-3 text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <motion.span
                    animate={{
                      color: billingCycle === 'annual' ? '#ffffff' : '#9ca3af',
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                  >
                    Annual
                  </motion.span>
                  <motion.span
                    animate={{
                      color: billingCycle === 'annual' ? '#22c55e' : '#60a5fa',
                      opacity: billingCycle === 'annual' ? 1 : 0.8,
                    }}
                    transition={{
                      duration: 0.2,
                    }}
                    className="text-sm font-bold"
                  >
                    -25%
                  </motion.span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* FREE TIER */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Free
                  </div>
                  <div className="text-5xl font-light mb-2">
                    $0
                    <span className="text-lg text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Try before you subscribe
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>5 AI thumbnails/month</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Basic styles & templates</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>720p resolution</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>Includes watermark</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>No face swap</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>Community support only</span>
                  </div>
                </div>

                <button
                  onClick={handleAuthAction}
                  className="w-full mt-8 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
                >
                  Start Free
                </button>
                <div className="text-center text-xs text-gray-500 mt-3">
                  No credit card required
                </div>
              </div>

              {/* STARTER TIER */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Starter
                  </div>
                  <div className="text-5xl font-light mb-2">
                    ${billingCycle === 'monthly' ? '9' : '7.50'}
                    <span className="text-lg text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Perfect for new creators
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>30 AI thumbnails/month</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>All styles & templates</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>1080p HD resolution</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>No watermark</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Face swap (1 face)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>No A/B testing</span>
                  </div>
                </div>

                <button
                  onClick={handleAuthAction}
                  className="w-full mt-8 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
                >
                  Get Started
                </button>
                <div className="text-center text-xs text-gray-500 mt-3">
                  {billingCycle === 'annual' && 'Save 17% annually'}
                  {billingCycle === 'monthly' && '7-day free trial'}
                </div>
              </div>

              {/* CREATOR PRO TIER - MOST POPULAR */}
              <div className="bg-gray-900/50 border-2 border-blue-600 rounded-2xl p-8 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-medium">
                    MOST POPULAR
                  </div>
                </div>

                <div className="mb-6 pt-6">
                  <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Creator Pro
                  </div>
                  <div className="text-5xl font-light mb-2">
                    ${billingCycle === 'monthly' ? '24' : '19'}
                    <span className="text-lg text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    For serious YouTubers
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>120 AI thumbnails/month</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>All Starter features</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Face training (5 faces)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>A/B test variations</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>2x faster generation</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Trending insights</span>
                  </div>
                </div>

                <button
                  onClick={handleAuthAction}
                  className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
                >
                  Get Started
                </button>
                <div className="text-center text-xs text-gray-500 mt-3">
                  14-day free trial included
                </div>
              </div>

              {/* AGENCY TIER */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
                <div className="mb-6">
                  <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Agency
                  </div>
                  <div className="text-5xl font-light mb-2">
                    ${billingCycle === 'monthly' ? '69' : '59'}
                    <span className="text-lg text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    For teams & agencies
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>500 AI thumbnails/month</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>All Creator Pro features</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Team collaboration (5 seats)</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Brand kit & templates</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>API access</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>White-label option</span>
                  </div>
                </div>

                <button
                  onClick={handleAuthAction}
                  className="w-full mt-8 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors"
                >
                  Contact Sales
                </button>
                <div className="text-center text-xs text-gray-500 mt-3">
                  Custom plans available
                </div>
              </div>
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
              {[
                {
                  question: 'What is ThumPiks and how does it work?',
                  answer:
                    'ThumPiks is an AI-powered thumbnail generator optimized for YouTube, with support for TikTok, Instagram, Twitter/X, Facebook, Twitch, and any other platform or general thumbnail needs. Simply paste your video link or describe what you want, choose your style preferences, and our AI instantly generates professional thumbnails optimized for maximum engagement. No design experience needed.',
                },
                {
                  question: 'What platforms and content types does ThumPiks support?',
                  answer:
                    'ThumPiks works great for all social media platforms including YouTube, TikTok, Instagram Reels, Twitter/X, Facebook, Twitch streams, and more. You can also generate thumbnails for blogs, podcasts, websites, course materials, or any project that needs eye-catching visuals. Our AI adapts to your specific platform needs and automatically optimizes for the best results.',
                },
                {
                  question: 'How is ThumPiks different from using Canva or Photoshop?',
                  answer:
                    'While Canva and Photoshop require manual design work, ThumPiks uses AI to instantly generate thumbnails tailored to your content. What takes 30-60 minutes manually takes just seconds with ThumPiks. Plus, our AI analyzes trending thumbnails across all major platforms to ensure your designs follow proven engagement patterns.',
                },
                {
                  question:
                    'What happens when I run out of thumbnails in my plan?',
                  answer:
                    'Your account will switch to the Free tier (5 thumbnails/month with watermark) until your next billing cycle. You can upgrade your plan anytime or purchase additional thumbnail credits if needed. All your previous creations remain accessible regardless of plan.',
                },
                {
                  question:
                    'Do my monthly thumbnails roll over to the next month?',
                  answer:
                    'Unused thumbnails do not roll over to the next billing period. Each month, your thumbnail count resets to your plan limit. We recommend this approach to keep pricing simple and predictable. If you need more thumbnails, consider upgrading to a higher tier.',
                },
                {
                  question: 'Can I cancel my subscription anytime?',
                  answer:
                    'Yes! You can cancel your ThumPiks subscription anytime from your account settings. There are no cancellation fees or penalties. You\'ll retain access to your plan features until the end of your current billing period, and all your created thumbnails remain accessible even after cancellation.',
                },
                {
                  question: 'Do you offer refunds or free trials?',
                  answer:
                    'All paid plans include a 14-day free trial (no credit card required for Free tier). If you\'re not satisfied within 7 days of your first payment, contact our support team for a full refund. We want you to be 100% confident that ThumPiks is right for your content creation needs.',
                },
              ].map((faq, i) => (
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
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-16 text-center">
              <div>
                <h2 className="text-5xl font-light mb-6">
                  Thumbnails That
                  <br />
                  <span className="text-blue-500">Actually Get Clicks</span>
                </h2>
                <p className="text-gray-400 text-lg mb-8">
                  Join 500+ creators using AI to grow their channels.
                  <br />
                  From YouTube to TikTok—professional thumbnails in 30 seconds.
                </p>
                <button
                  onClick={handleAuthAction}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg transition-colors text-lg font-medium"
                >
                  Get My Free Thumbnails
                </button>
                <div className="mt-6 text-sm text-gray-500">
                  No credit card • 5 free thumbnails every month
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
                Web Design/Development by Welawerks & New Media Tek
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
                  <button className="w-full border border-gray-700 bg-gray-800/50 hover:bg-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors text-sm font-medium">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#1f2937"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#1f2937"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#1f2937"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#1f2937"
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
                  <span className="text-gray-400">Terms of Service</span> and{' '}
                  <span className="text-gray-400">Privacy Policy</span>
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
                  <button className="w-full border border-gray-700 bg-gray-800/50 hover:bg-gray-800 rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors text-sm font-medium">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#1f2937"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#1f2937"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#1f2937"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#1f2937"
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
      </div>
    </>
  );
};

export default ThumPiksLanding;
