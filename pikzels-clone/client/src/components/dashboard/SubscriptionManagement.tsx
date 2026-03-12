import React, { useEffect, useState } from 'react';
import { X, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { authGet, authPost } from '../../utils/api';

interface Subscription {
  id: string;
  planType: string;
  creditsBalance: number;
  creditsUsed: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  cancelAtPeriodEnd: boolean;
  billingCycle: string;
}

interface SubscriptionManagementProps {
  onClose: () => void;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ onClose }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await authGet('/api/subscription/current');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await authPost('/api/subscription/cancel', {});
      if (response.ok) {
        await fetchSubscription();
        alert('Subscription cancelled successfully. You will retain access until the end of your billing period.');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const getPlanName = (planType: string) => {
    const plans: Record<string, string> = {
      free: 'Free',
      starter: 'Starter',
      pro: 'Creator Pro',
      ultra_pro: 'Ultra Pro',
    };
    return plans[planType] || planType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-slate-50">Subscription Management</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-slate-400">No active subscription found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-slate-50">Subscription Management</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Plan */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-medium text-slate-50">Current Plan</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Plan Type</span>
              <span className="text-slate-50 font-medium">{getPlanName(subscription.planType)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Billing Cycle</span>
              <span className="text-slate-50 capitalize">{subscription.billingCycle}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                subscription.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {subscription.status}
              </span>
            </div>
          </div>
        </div>

        {/* Credits */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-medium text-slate-50 mb-4">Credit Balance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Available Credits</span>
              <span className="text-2xl font-bold text-blue-500">{subscription.creditsBalance}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Credits Used This Period</span>
              <span className="text-slate-50">{subscription.creditsUsed}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (subscription.creditsUsed / (subscription.creditsBalance + subscription.creditsUsed)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>

        {/* Billing Period */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-medium text-slate-50">Billing Period</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Period Start</span>
              <span className="text-slate-50">{formatDate(subscription.periodStart)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Period End</span>
              <span className="text-slate-50">{formatDate(subscription.periodEnd)}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Warning */}
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-500 font-medium mb-1">Subscription Ending</h4>
                <p className="text-slate-300 text-sm">
                  Your subscription will end on {formatDate(subscription.periodEnd)}. 
                  You will retain access until then.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
          {subscription.planType !== 'free' && !subscription.cancelAtPeriodEnd && (
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-3 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canceling ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagement;
