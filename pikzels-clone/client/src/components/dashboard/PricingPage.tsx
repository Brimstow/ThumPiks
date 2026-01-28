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

          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors font-medium">
            Current Plan
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
              ${billingCycle === 'monthly' ? '9' : '7.50'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              Perfect for new creators
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>30 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All styles & templates</span>
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
              <span>Face swap (1 face)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>No A/B testing</span>
            </div>
          </div>

          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors font-medium">
            Upgrade
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            {billingCycle === 'annual' ? 'Save 17% annually' : '7-day free trial'}
          </div>
        </div>

        {/* Creator Pro Plan */}
        <div className="bg-[#0F172A] border-2 border-blue-600 rounded-2xl p-8 relative">
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
              ${billingCycle === 'monthly' ? '24' : '19'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              For serious YouTubers
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>120 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All Starter features</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Face training (5 faces)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>A/B test variations</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>2x faster generation</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Trending insights</span>
            </div>
          </div>

          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium">
            Upgrade
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            14-day free trial included
          </div>
        </div>

        {/* Agency Plan */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 hover:border-blue-500/50 transition-all">
          <div className="mb-6">
            <div className="text-sm text-slate-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Agency
            </div>
            <div className="text-5xl font-light mb-2 text-slate-50">
              ${billingCycle === 'monthly' ? '69' : '59'}
              <span className="text-lg text-slate-400">/month</span>
            </div>
            <div className="text-sm text-slate-400">
              For teams & agencies
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>500 AI thumbnails/month</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>All Creator Pro features</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Team collaboration (5 seats)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>Brand kit & templates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>API access</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>White-label option</span>
            </div>
          </div>

          <button className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg transition-colors font-medium">
            Contact Sales
          </button>
          <div className="text-center text-xs text-slate-500 mt-3">
            Custom plans available
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
                'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. For Agency plans, we can also arrange custom invoicing.',
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
    </main>
  );
};

export default PricingPage;