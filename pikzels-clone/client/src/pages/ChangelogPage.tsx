import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Zap, Rocket, Bug, Wrench, CheckCircle2 } from 'lucide-react';

const ChangelogPage: React.FC = () => {
  const navigate = useNavigate();

  const changes = [
    {
      version: '1.2.0',
      date: 'January 20, 2026',
      type: 'major',
      items: [
        {
          type: 'feature',
          title: 'New Pricing Tiers',
          description: 'Introduced FREE tier and optimized Creator Pro plan for better value.',
          icon: <Sparkles className="w-5 h-5" />,
        },
        {
          type: 'feature',
          title: 'Improved Face Swap',
          description: 'More accurate face swapping with better blending and multi-face support. Expression morphing coming soon.',
          icon: <Zap className="w-5 h-5" />,
        },
        {
          type: 'improvement',
          title: 'A/B Testing Dashboard (Preview)',
          description: 'Dashboard UI for comparing thumbnail variants. Automatic tracking integration coming soon.',
          icon: <Rocket className="w-5 h-5" />,
        },
      ],
    },
    {
      version: '1.1.5',
      date: 'January 10, 2026',
      type: 'minor',
      items: [
        {
          type: 'improvement',
          title: 'Faster Generation Speed',
          description: '2x faster thumbnail generation for Pro and Ultra Pro users with priority queue system.',
          icon: <Rocket className="w-5 h-5" />,
        },
        {
          type: 'fix',
          title: 'Fixed Text Rendering',
          description: 'Resolved issue where custom text would occasionally appear blurry at high resolutions.',
          icon: <Bug className="w-5 h-5" />,
        },
      ],
    },
    {
      version: '1.1.0',
      date: 'December 28, 2025',
      type: 'major',
      items: [
        {
          type: 'feature',
          title: 'Trending Insights (Preview)',
          description: 'Browse trending YouTube thumbnails by category and region. Full live data integration coming soon.',
          icon: <Sparkles className="w-5 h-5" />,
        },
        {
          type: 'improvement',
          title: 'Mobile App Beta',
          description: 'Released beta version of ThumPiks mobile app for iOS and Android.',
          icon: <Rocket className="w-5 h-5" />,
        },
      ],
    },
    {
      version: '1.0.5',
      date: 'December 15, 2025',
      type: 'minor',
      items: [
        {
          type: 'improvement',
          title: 'Style Presets & Layouts',
          description: 'Added curated style presets and composition layouts across gaming, tech, lifestyle, and education niches.',
          icon: <Rocket className="w-5 h-5" />,
        },
        {
          type: 'fix',
          title: 'Export Quality',
          description: 'Fixed 4K export quality issue affecting certain graphics card configurations.',
          icon: <Bug className="w-5 h-5" />,
        },
        {
          type: 'fix',
          title: 'Face Swap Accuracy',
          description: 'Improved face detection accuracy in low-light and side-angle scenarios.',
          icon: <Bug className="w-5 h-5" />,
        },
      ],
    },
    {
      version: '1.0.0',
      date: 'November 20, 2025',
      type: 'major',
      items: [
        {
          type: 'feature',
          title: 'ThumPiks Launch',
          description: 'Official public launch of ThumPiks with AI-powered thumbnail generation.',
          icon: <Sparkles className="w-5 h-5" />,
        },
        {
          type: 'feature',
          title: 'Core Features',
          description: 'Face swap, style library, text customization, and 1080p exports.',
          icon: <CheckCircle2 className="w-5 h-5" />,
        },
        {
          type: 'feature',
          title: 'User Dashboard',
          description: 'Complete user dashboard with thumbnail history, analytics, and account management.',
          icon: <Wrench className="w-5 h-5" />,
        },
      ],
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'feature':
        return 'bg-blue-600/20 border-blue-600/30 text-blue-500';
      case 'improvement':
        return 'bg-green-600/20 border-green-600/30 text-green-500';
      case 'fix':
        return 'bg-orange-600/20 border-orange-600/30 text-orange-500';
      default:
        return 'bg-gray-600/20 border-gray-600/30 text-gray-500';
    }
  };

  const getVersionBadgeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-blue-600 text-white';
      case 'minor':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

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
            <Rocket className="w-4 h-4 text-blue-500" />
            <span className="text-sm">Always improving, always evolving</span>
          </div>
          <h1 className="text-6xl font-light mb-6">
            Product
            <br />
            <span className="text-blue-500">Changelog</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10">
            Stay up to date with new features, improvements,
            <br />
            and fixes as we continuously improve ThumPiks.
          </p>
        </div>
      </section>

      {/* Changelog Timeline */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-12">
            {changes.map((change, index) => (
              <div key={index} className="relative">
                {/* Timeline Line */}
                {index !== changes.length - 1 && (
                  <div className="absolute left-6 top-16 bottom-0 w-px bg-gray-800"></div>
                )}

                {/* Version Card */}
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/50 transition-colors">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center">
                      <Rocket className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-2xl font-semibold">
                          Version {change.version}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getVersionBadgeColor(change.type)}`}
                        >
                          {change.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-400">{change.date}</p>
                    </div>
                  </div>

                  {/* Changes List */}
                  <div className="space-y-4">
                    {change.items.map((item, itemIndex) => (
                      <div
                        key={itemIndex}
                        className="flex gap-4 bg-gray-800/30 rounded-xl p-4 hover:bg-gray-800/50 transition-colors"
                      >
                        <div
                          className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${getTypeColor(item.type)}`}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h4 className="font-semibold text-lg">
                              {item.title}
                            </h4>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getTypeColor(item.type)}`}
                            >
                              {item.type}
                            </span>
                          </div>
                          <p className="text-gray-400 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-light mb-4">
              Coming <span className="text-blue-500">Soon</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Features we're actively working on
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-purple-500" />
                <h3 className="text-xl font-semibold">Video-to-Thumbnail AI</h3>
              </div>
              <p className="text-gray-400">
                Upload your video directly and let AI analyze the content to suggest the perfect thumbnail moments.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Expected: Q1 2026
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-semibold">Browser Extension</h3>
              </div>
              <p className="text-gray-400">
                Generate thumbnails directly from YouTube Studio with one click. Seamless workflow integration.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Expected: Q1 2026
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Rocket className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-semibold">Competitor Analysis</h3>
              </div>
              <p className="text-gray-400">
                Analyze your competitors' thumbnails and get AI recommendations to stand out in your niche.
              </p>
              <div className="mt-4 text-sm text-gray-500">
                Expected: Q2 2026
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-16 text-center">
            <h2 className="text-5xl font-light mb-6">
              Join Us on This
              <br />
              <span className="text-blue-500">Journey</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10">
              Be part of shaping the future of thumbnail creation
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Free Trial
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Send Feedback
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">Have feature requests? We'd love to hear from you!</p>
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

export default ChangelogPage;
