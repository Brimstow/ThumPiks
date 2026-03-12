import React, { useState, useEffect } from 'react';
import { Sparkles, Check, X, ChevronRight, Loader2, CreditCard, Shield, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authPost, authGet } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

interface Subscription {
  id: string;
  planType: string;
  creditsBalance: number;
  status: string;
  periodEnd: string;
}

interface PlanDetails {
  id: string;
  name: string;
  price: number;
  features: string[];
  thumbnails: number;
}

const PricingPage = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'confirm' | 'processing' | 'redirecting'>('confirm');

  useEffect(() => {
    fetchCurrentSubscription();
  }, []);

  const fetchCurrentSubscription = async () => {
    try {
      const response = await authGet('/api/subscription/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data);
      } else if (response.status === 401 || response.status === 403) {
        // User is not authenticated, redirect to login
        console.warn('User not authenticated, redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanDetails = (planId: string): PlanDetails => {
    const plans: Record<string, PlanDetails> = {
      starter: {
        id: 'starter',
        name: 'Starter',
        price: billingCycle === 'monthly' ? 19 : 15,
        thumbnails: 50,
        features: [
          '50 AI thumbnails/month',
          'All 9 AI tools',
          '1080p HD resolution',
          'No watermark',
          'Multi-format export (PNG/JPG/WebP)',
          'Email support'
        ]
      },
      pro: {
        id: 'pro',
        name: 'Creator Pro',
        price: billingCycle === 'monthly' ? 39 : 29,
        thumbnails: 200,
        features: [
          '200 AI thumbnails/month',
          'All Starter features',
          'Flash + Standard + Pro models',
          'A/B testing',
          'Vision / CTR analysis',
          'Brand kit & analytics'
        ]
      },
      ultra_pro: {
        id: 'ultra_pro',
        name: 'Ultra Pro',
        price: billingCycle === 'monthly' ? 79 : 59,
        thumbnails: 600,
        features: [
          '600 AI thumbnails/month',
          'All Creator Pro features',
          'All generations private',
          'Pro models default',
          'Early access to new features',
          'Dedicated support'
        ]
      }
    };
    return plans[planId] || plans.starter;
  };

  const handleUpgradeClick = (planId: string) => {
    if (planId === 'free' || upgrading) return;
    
    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      alert('🔐 Please Log In\n\nYou need to be logged in to upgrade your subscription.\n\nClick OK to go to the login page.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
      return;
    }
    
    const plan = getPlanDetails(planId);
    setSelectedPlan(plan);
    setShowConfirmModal(true);
    setCheckoutStep('confirm');
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan || upgrading) return;

    setCheckoutStep('processing');
    setUpgrading(selectedPlan.id);
    
    try {
      const response = await authPost('/api/subscription/create-checkout', {
        planId: selectedPlan.id,
        billingCycle,
      });

      if (response.ok) {
        const { url } = await response.json();
        console.log('🎭 Demo checkout URL:', url);
        
        // Show redirecting state
        setCheckoutStep('redirecting');
        
        // Wait a moment so user can see the redirecting message
        setTimeout(() => {
          window.location.href = url;
        }, 800);
      } else {
        const error = await response.json();
        console.error('Checkout error:', error);
        
        // Reset states
        setShowConfirmModal(false);
        setUpgrading(null);
        
        // Handle specific error cases
        if (response.status === 401 || response.status === 403) {
          alert('🔐 Authentication Error\n\nYour session has expired. Please log in again to continue.');
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.error?.includes('Stripe is not configured')) {
          alert('⚠️ Stripe is not configured in development.\n\nTo test payments:\n1. Add STRIPE_SECRET_KEY to your .env file\n2. Restart the backend server\n\nThe app works without Stripe for other features.');
        } else if (error.error?.includes('Access token required') || error.error?.includes('token')) {
          alert('🔐 Authentication Required\n\nPlease log in to upgrade your subscription.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else {
          alert(`❌ Checkout Failed

${error.error || 'Failed to create checkout session'}

Please try again or contact support if the issue persists.`);
        }
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      setShowConfirmModal(false);
      setUpgrading(null);
      alert('❌ Network Error\n\nCould not connect to the server. Please check:\n1. Backend server is running\n2. You have an active internet connection\n3. Try refreshing the page');
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setSelectedPlan(null);
    setUpgrading(null);
    setCheckoutStep('confirm');
  };

  const isCurrentPlan = (planId: string) => {
    if (!currentSubscription) return planId === 'free';
    return currentSubscription.planType === planId;
  };

  const getButtonText = (planId: string) => {
    if (upgrading === planId) return 'Processing...';
    if (isCurrentPlan(planId)) return 'Current Plan';
    if (planId === 'free') return 'Current Plan';
    return 'Upgrade';
  };

  const getButtonDisabled = (planId: string) => {
    return isCurrentPlan(planId) || upgrading !== null || planId === 'free';
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-50 mb-4">
          Choose Your Pricing Plan
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
          Select the perfect plan for your needs. All plans include our core features with no hidden fees.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center mb-12">
        <div className="inline-flex bg-slate-800 rounded-full p-1 border border-slate-700">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`relative px-8 py-3 rounded-full font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'text-white'
                : 'text-slate-400'
            }`}
          >
            {billingCycle === 'monthly' && (
              <motion.div
                layoutId="billing-indicator"
                className="absolute inset-0 bg-blue-600 rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">Monthly</span>
          </button>

          <button
            onClick={() => setBillingCycle('annual')}
            className={`relative px-8 py-3 rounded-full font-medium transition-all ${
              billingCycle === 'annual'
                ? 'text-white'
                : 'text-slate-400'
            }`}
          >
            {billingCycle === 'annual' && (
              <motion.div
                layoutId="billing-indicator"
                className="absolute inset-0 bg-blue-600 rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <span className="relative z-10">Annual -25%</span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 max-w-7xl mx-auto">
        {/* Free Plan */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Free
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              $0
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              Try before you subscribe
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>5 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Basic styles & templates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>720p resolution</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>Includes watermark</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>No face swap</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>Community support only</span>
            </div>
          </div>

          <button 
            onClick={() => handleUpgradeClick('free')}
            disabled={getButtonDisabled('free')}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {upgrading === 'free' && <Loader2 className="w-4 h-4 animate-spin" />}
            {getButtonText('free')}
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            No credit card required
          </div>
        </div>

        {/* Starter Plan */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Starter
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '19' : '15'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              Perfect for new creators
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>50 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All 9 AI tools</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>1080p HD resolution</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>No watermark</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Multi-format export</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Email support</span>
            </div>
          </div>

          <button 
            onClick={() => handleUpgradeClick('starter')}
            disabled={getButtonDisabled('starter')}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {upgrading === 'starter' && <Loader2 className="w-4 h-4 animate-spin" />}
            {getButtonText('starter')}
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            {billingCycle === 'annual' ? 'Save 21% annually' : '7-day free trial'}
          </div>
        </div>

        {/* Creator Pro Plan */}
        <div className="bg-[#0F172A] border-2 border-blue-600 rounded-2xl p-8 relative" data-testid="pro-plan-card">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-medium">
              MOST POPULAR
            </div>
          </div>

          <div className="mb-6 pt-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Creator Pro
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '39' : '29'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              For serious YouTubers
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>200 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All Starter features</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Flash + Standard + Pro models</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>A/B testing</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Vision / CTR analysis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Brand kit & analytics</span>
            </div>
          </div>

          <button 
            onClick={() => handleUpgradeClick('pro')}
            disabled={getButtonDisabled('pro')}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {upgrading === 'pro' && <Loader2 className="w-4 h-4 animate-spin" />}
            {getButtonText('pro')}
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            14-day free trial included
          </div>
        </div>

        {/* Ultra Pro Plan */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Ultra Pro
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '79' : '59'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              For power creators
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>600 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All Creator Pro features</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All generations private</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Pro models default</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Early access to new features</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Dedicated support</span>
            </div>
          </div>

          <button 
            onClick={() => handleUpgradeClick('ultra_pro')}
            disabled={getButtonDisabled('ultra_pro')}
            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            {upgrading === 'ultra_pro' && <Loader2 className="w-4 h-4 animate-spin" />}
            {getButtonText('ultra_pro')}
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            {billingCycle === 'annual' ? 'Save 25% annually' : '14-day free trial'}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-50 mb-4">
            Pricing & Billing FAQs
          </h2>
          <p className="text-slate-400 text-sm">
            Common questions about our pricing, billing, and credit system
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              question: 'What is ThumPiks and how does it work?',
              answer:
                'ThumPiks is an AI-powered thumbnail generator optimized for YouTube, with support for TikTok, Instagram, Twitter/X, Facebook, Twitch, and any other platform or general thumbnail needs. Simply paste your video link or describe what you want, choose your style preferences, and our AI instantly generates professional thumbnails optimized for maximum engagement.',
            },
            {
              question: 'What platforms and content types does ThumPiks support?',
              answer:
                'ThumPiks works great for all social media platforms including YouTube, TikTok, Instagram Reels, Twitter/X, Facebook, Twitch streams, and more. You can also generate thumbnails for blogs, podcasts, websites, course materials, or any project that needs eye-catching visuals. Our AI adapts to your specific platform needs.',
            },
            {
              question: 'How is ThumPiks different from manual design tools?',
              answer:
                'While tools like Canva and Photoshop require manual design work (30-60 minutes per thumbnail), ThumPiks uses AI to generate thumbnails in seconds. Our AI analyzes trending thumbnails across all major platforms to ensure your designs follow proven engagement patterns.',
            },
            {
              question: 'What happens when I run out of thumbnails in my plan?',
              answer:
                'Your account will switch to the Free tier (5 thumbnails/month with watermark) until your next billing cycle. You can upgrade your plan anytime or purchase additional thumbnail credits if needed. All your previous creations remain accessible.',
            },
            {
              question: 'Do my monthly thumbnails roll over to the next month?',
              answer:
                'Unused thumbnails do not roll over to the next billing period. Each month, your thumbnail count resets to your plan limit. We recommend this approach to keep pricing simple and predictable.',
            },
            {
              question: 'Can I cancel my subscription anytime?',
              answer:
                'Yes! You can cancel your ThumPiks subscription anytime from your account settings. There are no cancellation fees or penalties. You\'ll retain access to your plan features until the end of your current billing period.',
            },
            {
              question: 'Do you offer refunds or free trials?',
              answer:
                'All paid plans include a 14-day free trial (no credit card required for Free tier). If you\'re not satisfied within 7 days of your first payment, contact our support team for a full refund.',
            },
            {
              question: 'What payment methods do you accept?',
              answer:
                'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. For Ultra Pro plans, we can also arrange custom invoicing.',
            },
            {
              question: 'Is there a discount for annual billing?',
              answer:
                'Yes! When you choose annual billing, you save 17-21% compared to paying monthly (varies by plan). This applies to all paid tiers and is automatically calculated when you select the annual option.',
            },
            {
              question: 'Can I upgrade or downgrade my plan?',
              answer:
                'Absolutely! You can upgrade your plan at any time and changes take effect immediately. For downgrades, changes take effect at the end of your current billing period to ensure you get full value.',
            },
            {
              question: 'Are there any hidden fees?',
              answer:
                'No hidden fees whatsoever! The price you see is the price you pay. There are no setup fees, cancellation fees, or surprise charges. Additional features and add-ons are always clearly priced and optional.',
            },
          ].map((faq, i) => (
            <div
              key={i}
              className="rounded-xl bg-slate-900/50 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all overflow-hidden group"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <span className="font-medium text-slate-300 group-hover:text-blue-400 transition-colors">
                  {faq.question}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-slate-400 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="checkout-modal-overlay">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={checkoutStep === 'confirm' ? handleCancelConfirm : undefined}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-[#0F172A] border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl"
              data-testid="checkout-confirmation-modal"
              role="dialog"
              aria-labelledby="modal-title"
            >
              {checkoutStep === 'confirm' && (
                <>
                  {/* Authentication Warning (if somehow modal opened without auth) */}
                  {(!isAuthenticated || !user) && (
                    <div className="mb-6 bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-yellow-500 font-medium mb-1">Authentication Required</h4>
                          <p className="text-slate-300 text-sm">
                            You must be logged in to complete the checkout. Please log in and try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-full mb-4">
                      <CreditCard className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 id="modal-title" className="text-2xl font-semibold text-slate-50 mb-2">
                      Confirm Your Upgrade
                    </h3>
                    <p className="text-slate-400 text-sm">
                      You're about to upgrade to {selectedPlan.name}
                    </p>
                  </div>

                  <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-slate-800" data-testid="order-summary">
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-slate-300 font-medium">{selectedPlan.name} Plan</span>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-slate-50" data-testid="modal-price">
                          ${selectedPlan.price}
                        </div>
                        <div className="text-sm text-slate-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {selectedPlan.features.slice(0, 3).map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                      {selectedPlan.features.length > 3 && (
                        <div className="text-sm text-slate-400 pl-6">
                          + {selectedPlan.features.length - 3} more features
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Shield className="w-4 h-4" />
                        <span>Secure payment via Stripe</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Cancel anytime, no hidden fees</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={handleConfirmUpgrade}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      Continue to Payment
                    </button>
                    <button
                      onClick={handleCancelConfirm}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {checkoutStep === 'processing' && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-full mb-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-50 mb-2">
                    Preparing Your Checkout
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Setting up your secure payment session...
                  </p>
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span>Verifying account details</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span>Creating secure session</span>
                    </div>
                  </div>
                </div>
              )}

              {checkoutStep === 'redirecting' && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/10 rounded-full mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-semibold text-slate-50 mb-2">
                    Redirecting to Checkout
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Taking you to our secure payment page...
                  </p>
                  <div className="mt-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-green-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Please wait...</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default PricingPage;