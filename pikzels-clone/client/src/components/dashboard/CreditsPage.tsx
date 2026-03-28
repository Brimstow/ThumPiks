import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Calendar, Download, AlertCircle, CreditCard, ArrowRight, Check, Clock, ChevronDown, ChevronUp, X } from 'lucide-react';
import { authGet, authPost } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { usePricingData } from '../../hooks/usePricingData';

interface CreditTransaction {
  id: string;
  amount: number;
  type: 'usage' | 'purchase' | 'refund' | 'renewal';
  description: string;
  createdAt: string;
  balanceBefore: number;
  balanceAfter: number;
  thumbnailId?: string;
}

interface Subscription {
  id: string;
  planType: string;
  creditsBalance: number;
  creditsUsed: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  billingCycle: string;
}

const CreditsPage: React.FC = () => {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { creditPacks, loading: pricingLoading } = usePricingData();

  useEffect(() => {
    fetchData();
    
    // Check for success/cancel from Stripe redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setNotification({
        type: 'success',
        message: '✅ Credits purchased successfully! Your balance has been updated.',
      });
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/credits');
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
    if (params.get('cancel') === 'true') {
      setNotification({
        type: 'error',
        message: '⚠️ Purchase cancelled. No charges were made.',
      });
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/credits');
      // Auto-dismiss after 5 seconds
      setTimeout(() => setNotification(null), 5000);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subResponse, txResponse] = await Promise.all([
        authGet('/api/subscription/status'),
        authGet('/api/credits/transactions'),
      ]);

      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      if (txResponse.ok) {
        const txData = await txResponse.json();
        setTransactions(txData.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch credit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePack = async (packId: string) => {
    setPurchasingPack(packId);
    try {
      const response = await authPost('/api/credits/purchase', { packId });
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Failed to purchase credits:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setPurchasingPack(null);
    }
  };

  const getUsagePercentage = () => {
    if (!subscription) return 0;
    const total = subscription.creditsBalance + subscription.creditsUsed;
    return total > 0 ? (subscription.creditsUsed / total) * 100 : 0;
  };

  const isLowCredits = () => {
    if (!subscription) return false;
    const percentage = getUsagePercentage();
    return percentage >= 80;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredTransactions = filterType === 'all' 
    ? transactions 
    : transactions.filter(tx => tx.type === filterType);

  const displayedTransactions = showAllTransactions 
    ? filteredTransactions 
    : filteredTransactions.slice(0, 10);

  if (loading || pricingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading credit information...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020818] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Success/Error Notification */}
        {notification && (
          <div
            className={`mb-6 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-orange-500/10 border border-orange-500/30'
            }`}
          >
            <AlertCircle
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                notification.type === 'success' ? 'text-green-500' : 'text-orange-500'
              }`}
            />
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  notification.type === 'success' ? 'text-green-400' : 'text-orange-400'
                }`}
              >
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Credits & Usage</h1>
          <p className="text-slate-400">Manage your credit balance and purchase additional credits</p>
        </div>

        {/* Credit Balance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Balance Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm font-medium text-slate-300 uppercase tracking-wider">Current Balance</span>
                </div>
                <div className="text-5xl font-bold text-white mb-2">
                  {subscription?.creditsBalance ?? 0}
                </div>
                <p className="text-slate-400">
                  {subscription?.creditsUsed ?? 0} used this period
                </p>
              </div>
              <button
                onClick={() => navigate('/dashboard/pricing')}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                Upgrade Plan
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Usage Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Usage this period</span>
                <span className="text-sm text-slate-300 font-medium">
                  {Math.round(getUsagePercentage())}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isLowCredits() 
                      ? 'bg-gradient-to-r from-red-600 to-orange-600' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600'
                  }`}
                  style={{ width: `${Math.min(100, getUsagePercentage())}%` }}
                />
              </div>
            </div>

            {/* Low Credits Warning */}
            {isLowCredits() && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-orange-500 font-medium mb-1">Running Low on Credits</h4>
                  <p className="text-slate-300 text-sm">
                    You've used {Math.round(getUsagePercentage())}% of your credits. Consider purchasing additional credits or upgrading your plan.
                  </p>
                </div>
              </div>
            )}

            {/* Renewal Info */}
            {subscription && (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Credits renew on {formatDate(subscription.periodEnd)}</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Avg. Daily Usage</p>
                  <p className="text-2xl font-bold text-slate-50">
                    {subscription ? Math.round(subscription.creditsUsed / 30) : 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Days Remaining</p>
                  <p className="text-2xl font-bold text-slate-50">
                    {subscription 
                      ? Math.max(0, Math.ceil((new Date(subscription.periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Credit Packs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-50 mb-1">Purchase Additional Credits</h2>
              <p className="text-slate-400">Buy credit packs to extend your usage beyond your subscription</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creditPacks.map((pack) => (
              <div
                key={pack.id}
                className={`bg-slate-900/50 border rounded-xl p-6 hover:border-blue-500/50 transition-all relative ${
                  pack.popular ? 'border-blue-500/50 shadow-lg shadow-blue-500/20' : 'border-slate-800'
                }`}
              >
                {pack.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-yellow-500/20 rounded-full mb-3">
                    <Zap className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-50 mb-1">{pack.name}</h3>
                  <div className="text-3xl font-bold text-white mb-1">
                    {pack.credits}
                  </div>
                  <p className="text-sm text-slate-400">credits</p>
                </div>

                {pack.savings != null && (
                  <div className="text-center mb-4">
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                      {typeof pack.savings === 'number' ? `Save $${pack.savings}` : pack.savings}
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-slate-50">${pack.price}</div>
                  <div className="text-xs text-slate-500">
                    ${(pack.price / pack.credits).toFixed(2)} per credit
                  </div>
                </div>

                <button
                  onClick={() => handlePurchasePack(pack.id)}
                  disabled={purchasingPack === pack.id}
                  className={`w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                    pack.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {purchasingPack === pack.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Purchase
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-50 mb-1">Transaction History</h2>
              <p className="text-sm text-slate-400">Track all your credit transactions</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter Dropdown */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="usage">Usage</option>
                <option value="purchase">Purchases</option>
                <option value="renewal">Renewals</option>
                <option value="refund">Refunds</option>
              </select>
              
              <button
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {displayedTransactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4">
                <Zap className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-slate-400">No transactions yet</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">
                        Date
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">
                        Description
                      </th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">
                        Type
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">
                        Credits
                      </th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {displayedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-4 text-sm text-slate-300">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-200">
                          {tx.description}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              tx.type === 'usage'
                                ? 'bg-red-500/20 text-red-400'
                                : tx.type === 'purchase'
                                ? 'bg-green-500/20 text-green-400'
                                : tx.type === 'renewal'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                          </span>
                        </td>
                        <td
                          className={`py-4 px-4 text-sm font-medium text-right ${
                            tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-300 text-right font-medium">
                          {tx.balanceAfter}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Show More/Less Button */}
              {filteredTransactions.length > 10 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
                  >
                    {showAllTransactions ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Show All ({filteredTransactions.length - 10} more)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default CreditsPage;
