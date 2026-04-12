import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  Users,
  Palette,
  TrendingUp,
  Wand2,
  Image,
  Download,
  BarChart,
  Layers,
  Eye,
  Search,
  Video,
  Type,
  PenTool,
  Scan,
  FolderOpen,
  Share2,
  MousePointerClick,
  CheckCircle,
  Minus,
} from 'lucide-react';

const FeaturesPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Wand2 className="w-8 h-8" />,
      title: 'AI Image Generation',
      description:
        'Describe your thumbnail and watch AI create it in seconds. Choose from multiple style presets and model tiers optimized for speed or quality.',
      highlights: [
        'Text-to-image in seconds',
        'Style presets (cinematic, gaming, pro, bold)',
        'Model tiers: Flash, Standard, Pro',
        'YouTube, TikTok, Instagram & custom aspect ratios',
      ],
    },
    {
      icon: <PenTool className="w-8 h-8" />,
      title: 'AI Photo Editing Suite',
      description:
        'A complete AI editing toolkit — fix, enhance, expand, and transform any image without Photoshop skills.',
      highlights: [
        'Inpaint: edit specific areas with AI prompts',
        'Remove background in one click',
        'Upscale to 2x or 4x resolution',
        'Enhance (sharpen, denoise, HDR, color)',
        'Expand canvas in any direction (outpaint)',
        'Object removal: click to erase anything',
        'Recreate Better: upload old thumbnail, get improved version',
      ],
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'AI Face Swap',
      description:
        'Swap faces between images seamlessly. Perfect for creating consistent thumbnails across your channel or testing different expressions.',
      highlights: [
        'Seamless face replacement',
        'Multiple faces supported',
        'Works with any uploaded photo',
      ],
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'AI Auto-Layer Decompose',
      description:
        'AI splits any image into individually editable transparent layers — instant Photoshop-level control without the learning curve.',
      highlights: [
        'SAM 2 AI segmentation',
        'Separate people, objects, backgrounds',
        'Each layer fully editable in canvas',
      ],
    },
    {
      icon: <Type className="w-8 h-8" />,
      title: 'AI Smart Text',
      description:
        'Generate click-worthy titles and text overlays powered by GPT-4.1. Choose from 5 tone modes to match your content style.',
      highlights: [
        'GPT-4.1 powered suggestions',
        '5 tones: professional, casual, dramatic, humorous, clickbait',
        'Vision-aware: AI sees your thumbnail before suggesting',
      ],
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Vision & CTR Analysis',
      description:
        'Get an AI-powered click-through-rate score for any thumbnail. Understand exactly why some thumbnails outperform others.',
      highlights: [
        'Gemini vision analysis',
        'Face, text, color, composition & emotion scoring',
        'Attention heatmap overlay',
        'Actionable improvement suggestions',
      ],
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: 'Visual Similarity Search',
      description:
        'Find thumbnails that look like yours — or describe your vision and AI finds matches. See what competitors are doing in your niche.',
      highlights: [
        'Search by image or text description',
        'Vector-powered similarity matching',
        'Discover competing thumbnail styles',
      ],
    },
    {
      icon: <Video className="w-8 h-8" />,
      title: 'Video Frame Extraction',
      description:
        'Paste a video link and extract the perfect frame for your thumbnail. Works with YouTube, TikTok, Instagram, Twitch, and 1000+ platforms.',
      highlights: [
        'YouTube, TikTok, Twitch, Instagram & more',
        'Live progress streaming while extracting',
        'Shuffle for new frames instantly',
        'Powered by yt-dlp + ffmpeg',
      ],
    },
    {
      icon: <Download className="w-8 h-8" />,
      title: 'Multi-Format Export',
      description:
        'Export in any resolution or format. YouTube, Instagram, TikTok, or custom dimensions — we handle them all.',
      highlights: [
        '1080p, 4K & custom sizes',
        'PNG, JPG, WebP formats',
        'Platform-optimized presets',
      ],
    },
    {
      icon: <FolderOpen className="w-8 h-8" />,
      title: 'Projects & Organization',
      description:
        'Keep your thumbnail library organized with projects, templates, and curated layouts. Never lose track of your work.',
      highlights: [
        'Projects with bulk move & organize',
        'Save & reuse custom templates',
        'Curated composition layouts',
      ],
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Priority Processing',
      description:
        'Paid plans get 2-3x faster generation with multi-provider load balancing. Your thumbnails are created on the fastest available AI.',
      highlights: [
        'Multi-provider failover (4 AI backends)',
        'Dedicated priority queue',
        'Sub-10 second generation',
      ],
    },
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'No Watermarks',
      description:
        'All paid plans include watermark-free downloads. Professional, clean thumbnails ready for immediate upload.',
      highlights: [
        'Clean exports on all paid plans',
        'Instant downloads',
        'No branding or logos added',
      ],
    },
  ];

  const comingSoonFeatures = [
    {
      icon: <BarChart className="w-8 h-8" />,
      title: 'A/B Testing',
      description:
        'Compare thumbnail variants side by side and find which design drives the most clicks with built-in CTR tracking.',
      highlights: [
        'Up to 5 variants per test',
        'Side-by-side comparison',
        'Click-through rate tracking',
      ],
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: 'Trending Insights',
      description:
        'Browse trending thumbnails from YouTube by category and region. See what top creators are doing in your niche.',
      highlights: [
        'Real-time trend data',
        'Niche-specific insights',
        'Regional filtering',
      ],
    },
    {
      icon: <Image className="w-8 h-8" />,
      title: 'Brand Kit',
      description:
        'Save your logos, colors, fonts, and brand voice. AI wizard extracts your brand from any URL to maintain visual consistency.',
      highlights: [
        'Logo, color & font presets',
        'AI brand wizard',
        'Extract brand from any website',
      ],
    },
    {
      icon: <Share2 className="w-8 h-8" />,
      title: 'Social Sharing',
      description:
        'Share thumbnails with secure, token-based links. Track engagement and revoke access anytime.',
      highlights: [
        'Secure share links',
        'Engagement tracking',
        'Revoke access anytime',
      ],
    },
    {
      icon: <Scan className="w-8 h-8" />,
      title: 'Expression Detection',
      description:
        'Standalone tool to detect and score facial expressions via webcam or uploaded photos. Optimize your thumbnail face game before you shoot.',
      highlights: [
        'Webcam-powered live expression feedback',
        '8 expression types scored',
        'Thumbnail face optimization tips',
      ],
    },
  ];

  const useCases = [
    {
      title: 'Gaming Channels',
      description:
        'Create high-energy thumbnails with bold text, expressive faces, and gaming-style aesthetics.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Tech Reviews',
      description:
        'Professional, clean designs highlighting products with attention-grabbing elements.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Lifestyle & Vlogs',
      description:
        'Authentic, relatable thumbnails that capture personality and storytelling moments.',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'Educational Content',
      description:
        'Clear, informative designs that communicate value and credibility at a glance.',
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
            <span className="text-sm">
              Everything you need to create stunning thumbnails
            </span>
          </div>
          <h1 className="text-6xl font-light mb-6">
            Powerful Features for
            <br />
            <span className="text-blue-500">Maximum Clicks</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10">
            Two powerful editors, 12 AI tools, and everything you need —
            from image generation to vision analysis to video frame extraction.
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
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-gray-300"
                    >
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

      {/* Editor Comparison — Side by Side */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Two Editors, <span className="text-blue-500">One Goal</span>
            </h2>
            <p className="text-gray-400 text-lg">
              Choose the right tool for the job — speed or full creative control
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Editor */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-purple-600/50 transition-all duration-300 relative">
              <div className="absolute top-4 right-4">
                <span className="text-xs bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded-full px-2.5 py-1">
                  Speed First
                </span>
              </div>
              <div className="w-16 h-16 bg-purple-600/10 rounded-xl flex items-center justify-center text-purple-500 mb-6">
                <MousePointerClick className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Quick Editor</h3>
              <p className="text-gray-400 mb-6">
                Get from idea to finished thumbnail in under a minute. Paste a link, upload, or generate — then polish with AI tools and export.
              </p>
              <ul className="space-y-3">
                {[
                  { has: true, text: '3 input paths: Paste Link, AI Generate, Upload' },
                  { has: true, text: 'AI Command Bar (Ctrl+K)' },
                  { has: true, text: 'Remove Background (free)' },
                  { has: true, text: 'Face Swap' },
                  { has: true, text: 'Smart Text with AI suggestions' },
                  { has: true, text: 'Enhance & Recreate Better' },
                  { has: true, text: 'Video frame extraction built in' },
                  { has: true, text: 'Session persistence — resume where you left off' },
                  { has: false, text: 'No layer management' },
                  { has: false, text: 'No Smart Guides or adjustments panel' },
                  { has: false, text: 'No platform preview overlay' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {item.has ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                    <span className={item.has ? 'text-gray-300' : 'text-gray-600'}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-purple-400 mt-6 font-medium">
                Best for: quick edits, video frames, fast turnaround
              </p>
            </div>

            {/* Full Canvas Editor */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8 hover:border-blue-600/50 transition-all duration-300 relative">
              <div className="absolute top-4 right-4">
                <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full px-2.5 py-1">
                  Full Control
                </span>
              </div>
              <div className="w-16 h-16 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-6">
                <Palette className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Full Canvas Editor</h3>
              <p className="text-gray-400 mb-6">
                A professional layer-based editor with AI superpowers. Build complex compositions with precision tools — no Photoshop needed.
              </p>
              <ul className="space-y-3">
                {[
                  { has: true, text: 'Layer-based editing with reorder & grouping' },
                  { has: true, text: 'AI Command Bar (Ctrl+K)' },
                  { has: true, text: 'Smart Guides for pixel-perfect alignment' },
                  { has: true, text: 'Adjustments panel (brightness, contrast, etc.)' },
                  { has: true, text: 'Platform preview overlay (YouTube, TikTok)' },
                  { has: true, text: 'Contextual toolbar adapts to selected layer' },
                  { has: true, text: 'All AI tools (inpaint, expand, decompose, etc.)' },
                  { has: true, text: 'Shapes, masks, and blending modes' },
                  { has: false, text: 'No built-in video frame extraction' },
                  { has: false, text: 'No session persistence (project-based saves)' },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {item.has ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    )}
                    <span className={item.has ? 'text-gray-300' : 'text-gray-600'}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-blue-400 mt-6 font-medium">
                Best for: complex compositions, multi-layer designs, precision work
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/30 rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400">On the Roadmap</span>
            </div>
            <h2 className="text-5xl font-light mb-4">
              Coming <span className="text-blue-500">Soon</span>
            </h2>
            <p className="text-gray-400 text-lg">
              More powerful features are on the way
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {comingSoonFeatures.map((feature, index) => (
              <div
                key={index}
                className="relative bg-gray-900/30 border border-gray-800/60 rounded-2xl p-6 opacity-80"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full px-2.5 py-1">
                    Coming Soon
                  </span>
                </div>
                <div className="w-12 h-12 bg-gray-800/50 rounded-xl flex items-center justify-center text-gray-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm mb-4">{feature.description}</p>
                <ul className="space-y-1.5">
                  {feature.highlights.map((highlight, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-xs text-gray-500"
                    >
                      <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
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
                  <h3 className="text-2xl font-semibold mb-3">
                    {useCase.title}
                  </h3>
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
                  <th className="text-left p-6 text-gray-400 font-normal">
                    Feature
                  </th>
                  <th className="text-center p-6 font-semibold">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      ThumPiks
                    </div>
                  </th>
                  <th className="text-center p-6 text-gray-400 font-normal">
                    Manual Design
                  </th>
                  <th className="text-center p-6 text-gray-400 font-normal">
                    Generic AI
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Time to Create</td>
                  <td className="p-6 text-center text-green-500 font-semibold">
                    3–30 sec (varies by tier)
                  </td>
                  <td className="p-6 text-center text-gray-400">
                    30-60 minutes
                  </td>
                  <td className="p-6 text-center text-gray-400">
                    5-10 minutes
                  </td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Design Skills Required</td>
                  <td className="p-6 text-center text-green-500 font-semibold">
                    None
                  </td>
                  <td className="p-6 text-center text-gray-400">
                    Expert level
                  </td>
                  <td className="p-6 text-center text-gray-400">Basic</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Cost per Thumbnail</td>
                  <td className="p-6 text-center text-green-500 font-semibold">
                    $0.20 - $0.80
                  </td>
                  <td className="p-6 text-center text-gray-400">
                    $15-50 (outsourced)
                  </td>
                  <td className="p-6 text-center text-gray-400">$2-5</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">YouTube-Optimized</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">Maybe</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">AI Photo Editing (7 tools)</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">Plugins</td>
                  <td className="p-6 text-center text-gray-600">1-2 tools</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Face Swap</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">CTR Score & Vision Analysis</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Visual Similarity Search</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="p-6">Video Frame Extraction</td>
                  <td className="p-6 text-center text-green-500">✓</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                  <td className="p-6 text-center text-gray-600">×</td>
                </tr>
                <tr>
                  <td className="p-6">Auto-Layer Decompose</td>
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
              Be among the first creators to try ThumPiks — early access is open
              now
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                Start Free
              </button>
              <button
                onClick={() => navigate('/#pricing')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                View Pricing
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              No credit card required • 7-day free trial on paid plans
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>
            © {new Date().getFullYear()} ThumPiks LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FeaturesPage;
