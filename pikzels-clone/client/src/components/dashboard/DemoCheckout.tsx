import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authPost } from '../../utils/api';
import { CheckCircle, CreditCard, Clock } from 'lucide-react';

/**
 * Demo Checkout Page
 * Simulates Stripe checkout flow in development without real keys
 */
export default function DemoCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(8); // 8 seconds countdown
  const [autoComplete, setAutoComplete] = useState(true);

  const sessionId = searchParams.get('session');
  const userId = searchParams.get('user');
  const planId = searchParams.get('plan');
  const cycle = searchParams.get('cycle');

  // Get plan display name
  const getPlanName = (plan: string | null) => {
    const planNames: Record<string, string> = {
      starter: 'Starter',
      pro: 'Creator Pro',
      business: 'Agency'
    };
    return planNames[plan || ''] || plan;
  };

  // Get plan price
  const getPlanPrice = (plan: string | null, billingCycle: string | null) => {
    const prices: Record<string, { monthly: number; annual: number }> = {
      starter: { monthly: 9, annual: 7.50 },
      pro: { monthly: 24, annual: 19 },
      business: { monthly: 69, annual: 59 }
    };
    const planPrices = prices[plan || ''];
    if (!planPrices) return '$0';
    return billingCycle === 'annual' 
      ? `$${planPrices.annual}/month (billed annually)`
      : `$${planPrices.monthly}/month`;
  };

  useEffect(() => {
    // Countdown timer
    if (sessionId && userId && planId && cycle && countdown > 0 && autoComplete) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown, sessionId, userId, planId, cycle, autoComplete]);

  useEffect(() => {
    // Auto-complete when countdown reaches 0
    if (countdown === 0 && autoComplete) {
      completeDemoCheckout();
    }
  }, [countdown, autoComplete]);

  const completeDemoCheckout = async () => {
    setProcessing(true);
    setError('');
    setAutoComplete(false);

    try {
      // Check if this is a credit pack purchase (packId starts with 'pack_')
      const isCreditPack = planId?.startsWith('pack_');
      
      if (isCreditPack) {
        // For credit packs, redirect back to credits page with success
        // In production, the webhook would handle adding credits
        // In demo mode, we simulate instant credit addition
        setTimeout(() => {
          navigate('/dashboard/credits?success=true');
        }, 500);
      } else {
        // Original subscription flow
        const response = await authPost('/api/subscription/demo-complete', {
          session: sessionId,
          plan: planId,
          cycle: cycle,
        });

        if (response.ok) {
          // Success - redirect to dashboard with success message
          navigate('/dashboard?subscription=success');
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to complete demo checkout');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleManualComplete = () => {
    setAutoComplete(false);
    completeDemoCheckout();
  };

  if (!sessionId || !userId || !planId || !cycle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Session</h2>
          <p className="text-slate-300 mb-6">Missing checkout parameters</p>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md text-center">
        {/* Demo Mode Badge */}
        <div className="inline-block px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-medium mb-6">
          🎭 Demo Mode - Development Environment
        </div>

        {processing ? (
          <>
            {/* Processing State */}
            <div className="flex justify-center mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Processing Payment...</h2>
            <p className="text-slate-300 mb-4">
              Simulating Stripe checkout completion
            </p>
            <p className="text-sm text-slate-400">
              Plan: <span className="font-semibold text-white">{planId}</span> ({cycle})
            </p>
          </>
        ) : error ? (
          <>
            {/* Error State */}
            <div className="text-red-400 text-5xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Payment Failed</h2>
            <p className="text-slate-300 mb-6">{error}</p>
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/pricing')}
                className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Back to Pricing
              </button>
              <button
                onClick={completeDemoCheckout}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Initial State with Countdown */}
            <div className="relative">
              {/* Animated Icon */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <CreditCard className="w-20 h-20 text-purple-400" />
                  <div className="absolute -top-2 -right-2 bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-4">Demo Checkout</h2>
              
              {/* Demo Mode Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-200 text-sm font-medium mb-1">
                  🎭 Development Mode - No Real Payment
                </p>
                <p className="text-yellow-300/80 text-xs">
                  This simulates Stripe checkout. In production, you'll be redirected to Stripe's secure payment page.
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-slate-800/70 rounded-xl p-6 mb-6 text-left border border-slate-700">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                  Order Summary
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Plan:</span>
                    <span className="text-white font-semibold text-lg">{getPlanName(planId)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Billing Cycle:</span>
                    <span className="text-white font-medium capitalize">{cycle}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total:</span>
                      <span className="text-purple-400 font-bold text-xl">{getPlanPrice(planId, cycle)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-5 mb-6">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Clock className="w-6 h-6 text-blue-400 animate-pulse" />
                  <span className="text-blue-200 font-medium">Auto-completing in:</span>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">{countdown}</div>
                  <div className="text-blue-300 text-sm">seconds</div>
                </div>
                <div className="mt-4 bg-slate-800/50 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-1000"
                    style={{ width: `${((8 - countdown) / 8) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/pricing')}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualComplete}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Now
                </button>
              </div>

              {/* Info Text */}
              <p className="text-xs text-slate-500 mt-4 text-center">
                Session ID: {sessionId?.substring(0, 30)}...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
