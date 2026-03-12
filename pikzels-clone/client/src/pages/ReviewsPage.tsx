import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Quote, TrendingUp, Users, Zap, CheckCircle2 } from 'lucide-react';

const ReviewsPage: React.FC = () => {
  const navigate = useNavigate();

  const testimonials = [
    {
      name: 'Marcus Rivera',
      channel: '@TechExplained',
      subscribers: '245K',
      avatar: '/images/testimonials/review1.png',
      rating: 5,
      quote: "ThumPiks transformed my channel overnight. My click-through rate jumped from 4% to 11% in just two weeks. The AI understands what makes tech thumbnails pop!",
      improvement: '+175% CTR',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Sarah Chen',
      channel: '@SarahsGamingHub',
      subscribers: '892K',
      avatar: '/images/testimonials/review2.png',
      rating: 5,
      quote: "As a full-time creator, time is everything. ThumPiks saves me 5+ hours every week. The face training feature is a game-changer—my thumbnails finally look consistent.",
      improvement: '5 hrs/week saved',
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'David Kim',
      channel: '@FitnessWithDave',
      subscribers: '156K',
      avatar: '/images/testimonials/review3.png',
      rating: 5,
      quote: "I tried Canva, Photoshop, even hired designers. Nothing comes close to ThumPiks' speed and quality. The A/B testing helped me figure out exactly what my audience clicks on.",
      improvement: '+89% engagement',
      color: 'from-green-500 to-teal-500',
    },
    {
      name: 'Emily Rodriguez',
      channel: '@CookingWithEmily',
      subscribers: '423K',
      avatar: '/images/testimonials/review4.png',
      rating: 5,
      quote: "The trending insights are incredible! ThumPiks showed me which styles perform best in the cooking niche. My videos are hitting the algorithm faster than ever before.",
      improvement: '+320K views',
      color: 'from-orange-500 to-red-500',
    },
    {
      name: 'James Thompson',
      channel: '@AutoReviewsHQ',
      subscribers: '678K',
      avatar: '/images/testimonials/review5.png',
      rating: 5,
      quote: "Professional quality without the designer price tag. I used to pay $30 per thumbnail. Now it's pennies. The ROI is insane—ThumPiks paid for itself in the first week.",
      improvement: '$1,200/mo saved',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      name: 'Olivia Martinez',
      channel: '@OliviasVlogs',
      subscribers: '1.2M',
      avatar: '/images/testimonials/review6.png',
      rating: 5,
      quote: "The face swap feature is pure magic. I can keep my personal brand consistent across all thumbnails without spending hours in front of the camera. My team loves it too!",
      improvement: 'Power creator-ready',
      color: 'from-pink-500 to-rose-500',
    },
  ];

  const stats = [
    { value: '500+', label: 'Active Creators', icon: <Users className="w-6 h-6" /> },
    { value: '50,000+', label: 'Thumbnails Generated', icon: <Zap className="w-6 h-6" /> },
    { value: '8.7%', label: 'Avg CTR Increase', icon: <TrendingUp className="w-6 h-6" /> },
    { value: '4.9/5', label: 'Creator Rating', icon: <Star className="w-6 h-6" /> },
  ];

  const benefits = [
    'Proven to increase click-through rates by 75-200%',
    'Save 5+ hours per week on thumbnail creation',
    'Professional results without design experience',
    'ROI positive within the first month',
    'Consistent branding across your channel',
    'Optimized for YouTube\'s algorithm',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-white rounded"></div>
            <span>ThumPiks</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Back to Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg transition-colors"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 mb-8">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm">Loved by 500+ creators worldwide</span>
          </div>
          <h1 className="text-6xl font-light mb-6">
            Real Creators,
            <br />
            <span className="text-blue-500">Real Results</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10">
            See how ThumPiks is helping creators like you increase views,
            <br />
            save time, and grow their channels faster than ever.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 text-center hover:border-blue-600/50 transition-colors"
              >
                <div className="flex justify-center mb-4 text-blue-500">
                  {stat.icon}
                </div>
                <div className="text-4xl font-light mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Trusted by <span className="text-blue-500">Top Creators</span>
            </h2>
            <p className="text-gray-400 text-lg">
              From gaming to cooking, creators across every niche love ThumPiks
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/50 transition-all duration-300 hover:transform hover:scale-105 relative overflow-hidden"
              >
                {/* Gradient Overlay */}
                <div
                  className={`absolute top-0 right-0 w-48 h-48 bg-gradient-to-br ${testimonial.color} opacity-10 rounded-full blur-3xl`}
                ></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Quote Icon */}
                  <Quote className="w-8 h-8 text-blue-500 mb-4 opacity-50" />

                  {/* Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-yellow-500 fill-yellow-500"
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-gray-400">
                        {testimonial.channel} • {testimonial.subscribers} subs
                      </div>
                    </div>
                  </div>

                  {/* Improvement Badge */}
                  <div className="inline-flex items-center gap-2 bg-green-600/20 border border-green-600/30 rounded-full px-4 py-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      {testimonial.improvement}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Why Creators Choose <span className="text-blue-500">ThumPiks</span>
            </h2>
            <p className="text-gray-400 text-lg">
              The benefits that matter most to content creators
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-blue-600/50 transition-colors"
              >
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <span className="text-gray-300 text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Success <span className="text-blue-500">Stories</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Real growth metrics from our creator community
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="/images/testimonials/review1.png"
                  alt="Marcus Rivera"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-xl">Marcus Rivera</div>
                  <div className="text-gray-400">Tech Channel • 245K Subscribers</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-light text-green-500 mb-1">175%</div>
                  <div className="text-sm text-gray-400">CTR Increase</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-light text-blue-500 mb-1">820K</div>
                  <div className="text-sm text-gray-400">Extra Views</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-light text-purple-500 mb-1">$4.2K</div>
                  <div className="text-sm text-gray-400">Revenue Boost</div>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">
                "Within two weeks of switching to ThumPiks, my channel analytics completely transformed. 
                The AI-generated thumbnails consistently outperform my old manual designs. My audience 
                retention also improved because the thumbnails accurately represent the video content."
              </p>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="/images/testimonials/review2.png"
                  alt="Sarah Chen"
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div>
                  <div className="font-semibold text-xl">Sarah Chen</div>
                  <div className="text-gray-400">Gaming Channel • 892K Subscribers</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-light text-green-500 mb-1">5 hrs</div>
                  <div className="text-sm text-gray-400">Saved Weekly</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-light text-blue-500 mb-1">2.1M</div>
                  <div className="text-sm text-gray-400">Monthly Views</div>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-light text-purple-500 mb-1">89%</div>
                  <div className="text-sm text-gray-400">Faster Growth</div>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">
                "As a full-time creator managing daily uploads, ThumPiks is a lifesaver. The batch 
                generation feature lets me create an entire week's worth of thumbnails in minutes. 
                The consistent quality has helped establish my brand identity across 500+ videos."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-16 text-center">
            <h2 className="text-5xl font-light mb-6">
              Join 500+ Successful
              <br />
              <span className="text-blue-500">Content Creators</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              Start creating thumbnails that drive real results
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate('/#pricing')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                View Pricing
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">No credit card required • 14-day free trial</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} ThumPiks LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ReviewsPage;
