import React, { useState } from 'react';
import { Sparkles, Check, X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-7xl mx-auto">
        {/* Starter Plan */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Starter
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '15' : '12'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              Perfect for individuals and small projects
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>100 thumbnail generations/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>5 custom templates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>HD export quality</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Email support</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>Priority support</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>Team collaboration</span>
            </div>
          </div>

          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors font-medium">
            Get Started
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            No credit card required
          </div>
        </div>

        {/* Professional Plan */}
        <div className="bg-[#0F172A] border-2 border-blue-600 rounded-2xl p-8 relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-medium">
              MOST POPULAR
            </div>
          </div>

          <div className="mb-6 pt-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Professional
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '39' : '32'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              For teams with advanced AI needs
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>500 thumbnail generations/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>20 custom templates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>4K export quality</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Priority support</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Team collaboration (5 seats)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>Dedicated account manager</span>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium">
            Get Started
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            14 day free trial included
          </div>
        </div>

        {/* Enterprise Plan */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Enterprise
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '159' : '135'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              For organizations with advanced requirements
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Unlimited thumbnail generations</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Unlimited custom templates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>8K export quality</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>24/7 dedicated support</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Unlimited team seats</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Dedicated account manager</span>
            </div>
          </div>

          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors font-medium">
            Contact Sales
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            Custom pricing available
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
              question: 'How does the credit system work?',
              answer:
                'Each plan includes a monthly allocation of generation credits. One credit equals one thumbnail generation. Unused credits do not roll over to the next billing period, but you can purchase additional credits at any time if needed.',
            },
            {
              question: 'Can I purchase extra credits if I run out?',
              answer:
                'Yes! You can purchase additional credit packs at any time through your account dashboard. Extra credits are available in bundles of 50, 100, or 200 at discounted rates and never expire as long as your subscription is active.',
            },
            {
              question: 'What happens if I exceed my monthly credit limit?',
              answer:
                'If you reach your credit limit, you can either purchase additional credits or upgrade to a higher tier plan. Your account will remain active and you can still access all previously created thumbnails.',
            },
            {
              question: 'Do you offer refunds?',
              answer:
                'We offer a 14-day money-back guarantee for all new subscriptions. If you\'re not satisfied within the first 14 days, contact support for a full refund. After 14 days, all payments are non-refundable but you can cancel at any time to prevent future charges.',
            },
            {
              question: 'How do I cancel or change my subscription?',
              answer:
                'You can upgrade, downgrade, or cancel your subscription at any time from your account settings. Changes take effect immediately for upgrades or at the end of your current billing period for downgrades and cancellations.',
            },
            {
              question: 'What payment methods do you accept?',
              answer:
                'We accept all major credit cards (Visa, Mastercard, American Express, Discover), PayPal, and for Enterprise plans, we can also arrange for wire transfers or custom invoicing.',
            },
            {
              question: 'Is there a discount for annual billing?',
              answer:
                'Yes! When you choose annual billing, you save 25% compared to paying monthly. This applies to all plan tiers and is automatically calculated when you select the annual option.',
            },
            {
              question: 'Can I switch between monthly and annual billing?',
              answer:
                'Absolutely! You can switch from monthly to annual billing at any time to start saving. If switching from annual to monthly, the change will take effect at the end of your current annual period.',
            },
            {
              question: 'Do unused credits expire?',
              answer:
                'Monthly plan credits reset at the beginning of each billing cycle and do not carry over. However, any extra credits you purchase separately never expire as long as your subscription remains active.',
            },
            {
              question: 'Are there any hidden fees?',
              answer:
                'No hidden fees whatsoever! The price you see is the price you pay. There are no setup fees, cancellation fees, or surprise charges. Additional credits and add-ons are always clearly priced and optional.',
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
    </main>
  );
};

export default PricingPage;