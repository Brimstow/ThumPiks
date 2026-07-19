import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Zap, Check, CreditCard, Plus, Download, RefreshCw, ArrowRight } from 'lucide-react';
import { authFetch, authPost } from '../../utils/api';
import { usePricingData } from '../../hooks/usePricingData';
import type { PricingPlan } from '../../hooks/usePricingData';

function buildFeatureStrings(plan: PricingPlan): string[] {
  const f = plan.features;
  const entries: string[] = [];
  entries.push(`${plan.displayThumbnails} AI thumbnails/month`);
  if (f.resolution) entries.push(`${f.resolution} resolution`);
  if (f.watermark) {
    entries.push(f.watermarkFreeExports === 1 ? '1 watermark-free export/month' : 'Includes watermark');
  } else {
    entries.push('No watermark');
  }
  if (typeof f.faceSwap === 'number') {
    entries.push(f.faceSwap === -1 ? 'Unlimited face swaps' : `Face swap (${f.faceSwap}/month)`);
  }
  if (f.analytics) entries.push('Analytics & CTR tracking');
  if (f.abTesting === true) entries.push('Unlimited A/B testing');
  else if (typeof f.abTesting === 'number' && f.abTesting > 0) entries.push(`A/B testing (${f.abTesting} variants)`);
  if (f.support && f.support !== 'Community') entries.push(`${f.support} support`);
  if (f.customTemplates) entries.push('Custom templates');
  if (f.earlyAccess) entries.push('Early access to new features');
  if (f.privateModeDefault) entries.push('All generations private');
  return entries;
}

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault?: boolean;
}

interface BillingHistoryItem {
  id: string;
  description: string;
  date: string;
  amount: number;
  status: 'paid' | 'completed' | 'pending' | 'failed';
  invoiceUrl?: string;
}

interface Subscription {
  planType: string;
  billingCycle: 'monthly' | 'annual';
  creditsBalance: number;
  creditsUsed: number;
  periodEnd: string;
}

const BillingTab: React.FC = () => {
  const navigate = useNavigate();
  const { plans: pricingPlans } = usePricingData();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchBillingData();
    fetchCurrentSubscription();
  }, []);

  const fetchBillingData = async () => {
    setLoadingBilling(true);
    try {
      const pmResponse = await authFetch('/api/billing/payment-methods');
      if (pmResponse.ok) { const pmData = await pmResponse.json(); setPaymentMethods(pmData.paymentMethods || []); }
      const historyResponse = await authFetch('/api/billing/history');
      if (historyResponse.ok) { const historyData = await historyResponse.json(); setBillingHistory(historyData.history || []); }
    } catch (error) { console.error('Failed to fetch billing data:', error); }
    finally { setLoadingBilling(false); }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await authFetch('/api/subscription/current');
      if (response.ok) { const data = await response.json(); setCurrentSubscription(data); }
    } catch (error) { console.error('Failed to fetch current subscription:', error); }
  };

  const handleManagePaymentMethods = async () => {
    try {
      const response = await authPost('/api/billing/portal', { returnUrl: window.location.href });
      if (response.ok) { const data = await response.json(); window.location.href = data.url; }
    } catch (error) { console.error('Failed to create billing portal session:', error); }
  };

  const findPlan = (planType: string) => pricingPlans.find(p => p.id === planType);

  const freePlan = findPlan('free');
  const subscriptionPlan = currentSubscription ? {
    name: findPlan(currentSubscription.planType)?.name ?? currentSubscription.planType,
    price: (() => { const plan = findPlan(currentSubscription.planType); if (!plan) return 0; return currentSubscription.billingCycle === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice; })(),
    billingCycle: currentSubscription.billingCycle || 'monthly',
    credits: currentSubscription.creditsBalance + currentSubscription.creditsUsed,
    creditsUsed: currentSubscription.creditsUsed,
    renewalDate: new Date(currentSubscription.periodEnd).toISOString().split('T')[0],
    features: (() => { const plan = findPlan(currentSubscription.planType); return plan ? buildFeatureStrings(plan) : ['AI thumbnail generation']; })(),
  } : {
    name: freePlan?.name ?? 'Free',
    price: 0,
    billingCycle: 'monthly',
    credits: freePlan?.credits ?? 150,
    creditsUsed: 0,
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    features: freePlan ? buildFeatureStrings(freePlan) : ['AI thumbnail generation', '720p resolution'],
  };

  return (
    <>
      {/* Current Plan */}
      <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">Current Plan</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{subscriptionPlan.name}</h2>
            <p className="text-slate-400">${subscriptionPlan.price}/month &bull; Renews on {subscriptionPlan.renewalDate}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => navigate('/dashboard/pricing')} className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">Change Plan</button>
            <button onClick={() => navigate('/dashboard/credits')} className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Zap className="w-4 h-4" /><span className="hidden sm:inline">Manage</span> Credits
            </button>
          </div>
        </div>
        <button onClick={() => navigate('/dashboard/credits')} className="w-full bg-slate-900/50 rounded-xl p-4 hover:bg-slate-800/50 transition-colors text-left group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /><span className="text-sm text-slate-300">Credits Usage</span></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">{subscriptionPlan.creditsUsed} / {subscriptionPlan.credits} used</span>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${(subscriptionPlan.creditsUsed / subscriptionPlan.credits) * 100}%` }} />
          </div>
        </button>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {subscriptionPlan.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-slate-300"><Check className="w-4 h-4 text-green-400" />{feature}</div>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-slate-100">Payment Methods</h2>
          <button onClick={handleManagePaymentMethods} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Manage Payment Methods</span><span className="sm:hidden">Manage</span>
          </button>
        </div>
        {loadingBilling ? (
          <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : paymentMethods.length > 0 ? (
          <div className="space-y-3">
            {paymentMethods.map(pm => (
              <div key={pm.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-8 rounded flex items-center justify-center ${pm.card.brand === 'visa' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : pm.card.brand === 'mastercard' ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-slate-600 to-slate-500'}`}>
                    <span className="text-white text-xs font-bold uppercase">{pm.card.brand}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; {pm.card.last4}</p>
                    <p className="text-xs text-slate-500">Expires {pm.card.expMonth}/{pm.card.expYear}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pm.isDefault && <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Default</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm mb-4">No payment methods on file</p>
            <button onClick={handleManagePaymentMethods} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Add Payment Method</button>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Billing History</h2>
        {loadingBilling ? (
          <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-slate-500" /></div>
        ) : billingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Description</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Date</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Status</th>
                  <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.map(item => (
                  <tr key={item.id} className="border-b border-slate-800/50">
                    <td className="py-3 text-sm text-slate-200">{item.description}</td>
                    <td className="py-3 text-sm text-slate-400">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="py-3 text-sm text-slate-200">${(item.amount / 100).toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${item.status === 'paid' || item.status === 'completed' ? 'bg-green-500/20 text-green-400' : item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{item.status}</span>
                    </td>
                    <td className="py-3 text-right">
                      {item.invoiceUrl && <a href={item.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">Download</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <Download className="w-12 h-12 mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">No billing history yet</p>
          </div>
        )}
      </div>
    </>
  );
};

export default BillingTab;
