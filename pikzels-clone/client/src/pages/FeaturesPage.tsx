import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, Zap, Users, Palette, TrendingUp, Shield, 
  Wand2, Image, Clock, Download, BarChart, Layers 
} from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Wand2 className="w-8 h-8" />,
      title: 'AI-Powered Generation',
      description: 'Our advanced AI analyzes your video content and generates click-worthy thumbnails in seconds. No design experience needed.',
      highlights: ['Instant generation', 'Content-aware AI', 'Multiple style options'],
    },
    {
      icon: <Image className="w-8 h-8" />,
      title: 'Face Swap & Training',
      description: 'Train the AI on your face or brand ambassadors. Swap faces seamlessly to create consistent, professional thumbnails.',
      highlights: ['Custom face training', 'Expression morphing', 'Multiple faces supported'],
    },
    {
      icon: <Palette className="w-8 h-8" />,
      title: 'Extensive Style Library',
      description: 'Choose from hundreds of pre-designed styles optimized for different content types. Gaming, tech, lifestyle, and more.',
      highlights: ['500+ templates', 'Genre-specific styles', 'Trending designs'],
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'A/B Testing Variations',
      description: 'Generate multiple thumbnail variations and test which performs best. Data-driven decisions for maximum clicks.',
      highlights: ['3+ variations per design', 'Side-by-side comparison', 'Performance analytics'],
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: 'Batch Processing',
      description: 'Generate thumbnails for multiple videos at once. Perfect for content creators with consistent upload schedules.',
      highlights: ['Process up to 50 at once', 'Bulk download', 'Consistent branding'],
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Trending Insights',
      description: 'AI-powered analysis of top-performing thumbnails in your niche. Stay ahead of trends and maximize click-through rates.',
      highlights: ['Real-time trend data', 'Niche-specific insights', 'Click prediction'],
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: 'Multi-Format Export',
      description: 'Export in any resolution or format. YouTube, Instagram, Twitter, or custom dimensions—we support them all.',
      highlights: ['1080p, 4K, custom sizes', 'PNG, JPG, WebP formats', 'Platform-optimized'],
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Brand Kit',
      description: 'Save your logos, colors, and fonts to maintain a consistent visual identity across all your thumbnails.',
      highlights: ['Logo & color presets', 'Font library', 'Consistent branding'],
    },
    {
      icon: <BarChart className="w-8 h-8" />,
      title: 'Performance Analytics',
      description: 'Track which thumbnails perform best. Integrated analytics help you understand what drives clicks and views.',
      highlights: ['Click-through tracking', 'A/B test results', 'Performance reports'],
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Commercial License',
      description: 'Full commercial rights to all generated thumbnails. Use them for client work, monetized videos, or any business purpose.',
      highlights: ['Full commercial use', 'No attribution required', 'Unlimited usage rights'],
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Priority Generation',
      description: 'Pro and Ultra Pro users get 2-3x faster generation speeds. Perfect for creators who need thumbnails quickly.',
      highlights: ['Sub-10 second generation', 'Dedicated processing', 'Queue priority'],
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'No Watermarks',
      description: 'All paid plans include watermark-free downloads. Professional, clean thumbnails ready for immediate upload.',
      highlights: ['Clean exports', 'Instant downloads', 'No branding'],
    },
  ];

  const useCases = [
    {
      title: 'Gaming Channels',
      description: 'Create high-energy thumbnails with bold text, expressive faces, and gaming-style aesthetics.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Tech Reviews',
      description: 'Professional, clean designs highlighting products with attention-grabbing elements.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Lifestyle & Vlogs',
      description: 'Authentic, relatable thumbnails that capture personality and storytelling moments.',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'Educational Content',
      description: 'Clear, informative designs that communicate value and credibility at a glance.',
      color: 'from-green-500 to-teal-500',
    },
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
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Everything you need to create stunning thumbnails</span>
          </div>
          <h1 className="text-6xl font-light mb-6">
            Powerful Features for
            <br />
            <span className="text-blue-500">Maximum Clicks</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10">
            From AI-powered generation to brand consistency, ThumPiks has every tool you need
            <br />
            to create thumbnails that drive views and grow your channel.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/50 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="w-16 h-16 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-gray-400 mb-6">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.highlights.map((highlight, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Perfect for <span className="text-blue-500">Every Creator</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Optimized for all content types and niches
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="relative bg-gray-900/50 border border-gray-800 rounded-2xl p-8 overflow-hidden group hover:border-gray-700 transition-colors"
              >
                <div
                  className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${useCase.color} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`}
                ></div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-semibold mb-3">{useCase.title}</h3>
                  <p className="text-gray-400">{useCase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Why Choose <span className="text-blue-500">ThumPiks</span>
            </h2>
            <p className="text-gray-400 text-lg">
              See how we compare to traditional design methods
            </p>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left p-6 text-gray-400 font-normal">Feature</th>
                  <th className="text-center p-6 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      ThumPiks
                    </div>
                  </th>
                  <th className="text-center p-6 text-gray-400 font-normal">Manual Design</th>
                  <th className="text-center p-6 text-gray-400 font-normal">Generic AI</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Time to Create</td>
                  <td className="p-6 text-center text-green-500 font-semibold">10 seconds</td>
                  <td className="p-6 text-center text-gray-400">30-60 minutes</td>
                  <td className="p-6 text-center text-gray-400">5-10 minutes</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Design Skills Required</td>
                  <td className="p-6 text-center text-green-500 font-semibold">None</td>
                  <td className="p-6 text-center text-gray-400">Expert level</td>
                  <td className="p-6 text-center text-gray-400">Basic</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Cost per Thumbnail</td>
                  <td className="p-6 text-center text-green-500 font-semibold">$0.20 - $0.80</td>
                  <td className="p-6 text-center text-gray-400">$15-50 (outsourced)</td>
                  <td className="p-6 text-center text-gray-400">$2-5</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">YouTube-Optimized</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">Maybe</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">A/B Testing</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr>
                  <td className="p-6">Face Training</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-16 text-center">
            <h2 className="text-5xl font-light mb-6">
              Ready to Create
              <br />
              <span className="text-blue-500">10/10 Thumbnails?</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              Join thousands of creators using ThumPiks to grow their channels
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

export default FeaturesPage;
