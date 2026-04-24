import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Check,
  X,
  ChevronRight,
  Loader2,
  CreditCard,
  Shield,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authPost, authGet } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePricingData, PricingPlan } from '../../hooks/usePricingData';
import BetaPhaseBanner from '../shared/BetaPhaseBanner';

// ---------------------------------------------------------------------------
// Memoized plan card — only re-renders when price or billingCycle changes.
// Features, name, description never change so they skip reconciliation.
// ---------------------------------------------------------------------------
interface PlanCardProps {
  plan: PricingPlan;
  billingCycle: 'monthly' | 'annual';
  isCurrentPlan: boolean;
  upgrading: string | null;
  onUpgrade: (planId: string) => void;
}

function formatPrice(amount: number): {
  dollars: string;
  cents: string;
  hasCents: boolean;
} {
  const dollars = Math.floor(amount);
  const cents = Math.round((amount - dollars) * 100);
  return {
    dollars: dollars.toString(),
    cents: cents.toString().padStart(2, '0'),
    hasCents: cents > 0,
  };
}

const PlanCard = memo(
  ({
    plan,
    billingCycle,
    isCurrentPlan,
    upgrading,
    onUpgrade,
  }: PlanCardProps) => {
    const price =
      billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    const originalPrice =
      billingCycle === 'monthly'
        ? plan.originalMonthlyPrice
        : plan.originalAnnualPrice;
    const showStrikethrough = plan.hasDiscount && originalPrice > price;
    const { dollars, cents, hasCents } = formatPrice(price);
    const discountPercent = showStrikethrough
      ? Math.round((1 - price / originalPrice) * 100)
      : 0;
    const isPopular = plan.popular;
    const isFree = plan.monthlyPrice === 0;

    const buttonLabel =
      upgrading === plan.id
        ? 'Processing...'
        : isCurrentPlan || plan.id === 'free'
          ? 'Current Plan'
          : 'Upgrade';
    const buttonDisabled =
      isCurrentPlan || upgrading !== null || plan.id === 'free';

    // Build feature entries dynamically — mirrors landing page PricingCard logic
    const featureEntries = useMemo<
      Array<{ label: string; positive: boolean }>
    >(() => {
      const entries: Array<{ label: string; positive: boolean }> = [];

      // Thumbnails
      entries.push({
        label: `${plan.credits} AI thumbnail credits/month`,
        positive: true,
      });

      // Resolution
      if (plan.features.resolution) {
        entries.push({
          label: `${plan.features.resolution} resolution`,
          positive: true,
        });
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
            label: plan.features.abTesting
              ? 'A/B testing (coming soon)'
              : 'No A/B testing',
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

      // Brand Kit (coming soon for all paid plans)
      if (plan.monthlyPrice > 0) {
        entries.push({ label: 'Brand kit (coming soon)', positive: true });
      }

      // Support — same for all plans (honest, no fake tiers)
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
    }, [plan.features, plan.credits, plan.monthlyPrice]);

    // Sub-note below CTA
    let subNote: string;
    if (isFree) {
      subNote = 'No credit card required';
    } else if (billingCycle === 'annual' && plan.annualSavings > 0) {
      subNote = `Save ${plan.annualSavings}% annually`;
    } else {
      subNote = '7-day free trial';
    }

    return (
      <div
        data-testid={isPopular ? 'pro-plan-card' : undefined}
        className={`bg-[#0F172A] rounded-2xl p-5 sm:p-8 relative flex flex-col ${
          isPopular
            ? 'border-2 border-blue-600'
            : 'border border-slate-800 hover:border-blue-500/50 transition-all'
        }`}
      >
        {isPopular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-medium">
              MOST POPULAR
            </div>
          </div>
        )}

        <div className={`mb-6 ${isPopular ? 'pt-6' : ''}`}>
          <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {plan.name}
          </div>
          <div className="mb-2 text-slate-50">
            <span className="text-5xl font-light">${dollars}</span>
            {hasCents && <sup className="text-xl font-light">{cents}</sup>}
            <span className="text-lg text-slate-400">
              /{billingCycle === 'monthly' ? 'month' : 'year'}
            </span>
          </div>
          {showStrikethrough && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-red-400 font-semibold">
                -{discountPercent}%
              </span>
              <span className="text-slate-500 line-through">
                ${originalPrice}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
          )}
          <div className="text-sm text-slate-400">{plan.description}</div>
        </div>

        <div className="space-y-4 flex-grow">
          {featureEntries.map((feat, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 text-sm ${
                feat.positive ? 'text-slate-300' : 'text-slate-600'
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
          <button
            onClick={() => onUpgrade(plan.id)}
            disabled={buttonDisabled}
            className={`w-full disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
              isPopular
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {upgrading === plan.id && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {buttonLabel}
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            {subNote}
          </div>
        </div>
      </div>
    );
  }
);

interface Subscription {
  id: string;
  planType: string;
  creditsBalance: number;
  status: string;
  periodEnd: string;
}

const PricingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const {
    phase,
    spotsLeft,
    spotsTotal,
    endsAt,
    plans,
    faqs,
    loading: pricingLoading,
    error: pricingError,
  } = usePricingData();
  const hasBetaDiscount = phase && phase.discountPercentMonthly > 0;
  const annualSavingsPercent = useMemo(() => {
    const paid = plans.find(p => p.monthlyPrice > 0);
    if (!paid || paid.monthlyPrice === 0) return 25;
    const monthlyTotal = paid.monthlyPrice * 12;
    return Math.round((1 - paid.annualPrice / monthlyTotal) * 100);
  }, [plans]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    'monthly'
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentSubscription, setCurrentSubscription] =
    useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<
    'confirm' | 'processing' | 'redirecting'
  >('confirm');

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

  const handleUpgradeClick = (planId: string) => {
    if (planId === 'free' || upgrading) return;

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      alert(
        '🔐 Please Log In\n\nYou need to be logged in to upgrade your subscription.\n\nClick OK to go to the login page.'
      );
      setTimeout(() => {
        window.location.href = '/login';
      }, 500);
      return;
    }

    const plan = plans.find(p => p.id === planId);
    if (!plan) return;
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
          alert(
            '🔐 Authentication Error\n\nYour session has expired. Please log in again to continue.'
          );
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.error?.includes('Stripe is not configured')) {
          alert(
            '⚠️ Stripe is not configured in development.\n\nTo test payments:\n1. Add STRIPE_SECRET_KEY to your .env file\n2. Restart the backend server\n\nThe app works without Stripe for other features.'
          );
        } else if (
          error.error?.includes('Access token required') ||
          error.error?.includes('token')
        ) {
          alert(
            '🔐 Authentication Required\n\nPlease log in to upgrade your subscription.'
          );
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
        } else if (error.code === 'INVALID_EMAIL') {
          const goToSettings = confirm(
            `⚠️ Email Issue\n\n${error.error}\n\nWould you like to go to Account Settings now?`
          );
          if (goToSettings) {
            window.location.href = '/dashboard/settings';
          }
        } else {
          alert(
            `❌ Checkout Failed\n\n${error.error || 'Failed to create checkout session'}\n\nPlease try again or contact support if the issue persists.`
          );
        }
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      setShowConfirmModal(false);
      setUpgrading(null);
      alert(
        '❌ Network Error\n\nCould not connect to the server. Please check:\n1. Backend server is running\n2. You have an active internet connection\n3. Try refreshing the page'
      );
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
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-50 mb-4">
          Choose Your Pricing Plan
        </h1>
        <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
          Select the perfect plan for your needs. All plans include our core
          features with no hidden fees.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center mb-12">
        <div className="relative inline-flex bg-slate-800 rounded-full p-1 border border-slate-700">
          <div
            className="absolute top-1 bottom-1 bg-blue-600 rounded-full transition-none"
            style={{
              left: billingCycle === 'monthly' ? 4 : '50%',
              right: billingCycle === 'monthly' ? '50%' : 4,
            }}
          />
          <button
            onClick={() => setBillingCycle('monthly')}
            className="relative z-10 px-4 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium flex items-center gap-1.5 text-sm sm:text-base"
            style={{
              color: billingCycle === 'monthly' ? '#ffffff' : '#94a3b8',
            }}
          >
            Monthly
            {hasBetaDiscount && (
              <span
                className="text-sm font-bold"
                style={{
                  color: billingCycle === 'monthly' ? '#22c55e' : '#60a5fa',
                }}
              >
                -{phase.discountPercentMonthly}%
              </span>
            )}
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className="relative z-10 px-4 sm:px-8 py-2.5 sm:py-3 rounded-full font-medium flex items-center gap-1.5 text-sm sm:text-base"
            style={{ color: billingCycle === 'annual' ? '#ffffff' : '#94a3b8' }}
          >
            Annual
            <span
              className="text-sm font-bold"
              style={{
                color: billingCycle === 'annual' ? '#22c55e' : '#60a5fa',
              }}
            >
              -
              {hasBetaDiscount
                ? phase.discountPercentAnnual
                : annualSavingsPercent}
              %
            </span>
          </button>
        </div>
      </div>

      {/* Beta Phase Banner */}
      {phase && (
        <div className="max-w-7xl mx-auto">
          <BetaPhaseBanner
            phase={phase}
            spotsLeft={spotsLeft}
            spotsTotal={spotsTotal}
            endsAt={endsAt}
          />
        </div>
      )}

      {/* Pricing Cards */}
      {pricingLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : pricingError ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{pricingError}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16 max-w-7xl mx-auto">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              isCurrentPlan={isCurrentPlan(plan.id)}
              upgrading={upgrading}
              onUpgrade={handleUpgradeClick}
            />
          ))}
        </div>
      )}

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
          {faqs.map((faq, i) => (
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

      {/* Compare link */}
      <div className="text-center mt-10 mb-6">
        <p className="text-slate-500 text-sm mb-2">
          Wondering how ThumPiks compares to other thumbnail tools?
        </p>
        <button
          onClick={() => navigate('/compare')}
          className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors inline-flex items-center gap-1.5"
        >
          See the full feature comparison
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && selectedPlan && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            data-testid="checkout-modal-overlay"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={
                checkoutStep === 'confirm' ? handleCancelConfirm : undefined
              }
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative bg-[#0F172A] border border-slate-700 rounded-2xl p-5 sm:p-8 max-w-md w-full shadow-2xl"
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
                          <h4 className="text-yellow-500 font-medium mb-1">
                            Authentication Required
                          </h4>
                          <p className="text-slate-300 text-sm">
                            You must be logged in to complete the checkout.
                            Please log in and try again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/10 rounded-full mb-4">
                      <CreditCard className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3
                      id="modal-title"
                      className="text-2xl font-semibold text-slate-50 mb-2"
                    >
                      Confirm Your Upgrade
                    </h3>
                    <p className="text-slate-400 text-sm">
                      You're about to upgrade to {selectedPlan.name}
                    </p>
                  </div>

                  <div
                    className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-slate-800"
                    data-testid="order-summary"
                  >
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="text-slate-300 font-medium">
                        {selectedPlan.name} Plan
                      </span>
                      <div className="text-right">
                        <div
                          className="text-3xl font-bold text-slate-50"
                          data-testid="modal-price"
                        >
                          $
                          {billingCycle === 'monthly'
                            ? selectedPlan.monthlyPrice
                            : selectedPlan.annualPrice}
                        </div>
                        <div className="text-sm text-slate-400">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>
                          {selectedPlan.credits} AI thumbnail credits/month
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>
                          {selectedPlan.features.resolution} resolution
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{selectedPlan.features.support}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Shield className="w-4 h-4" />
                        <span>Secure payment via Polar</span>
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
                      <div
                        className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                        style={{ animationDelay: '0.2s' }}
                      />
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
