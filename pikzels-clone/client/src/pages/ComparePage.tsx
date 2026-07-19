import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  X,
  Minus,
  Wand2,
  PenTool,
  Layers,
  Eye,
  Search,
  Video,
  BarChart,
  Palette,
  Command,
  Monitor,
  ArrowRight,
  DollarSign,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type CellValue =
  | { type: 'yes'; label?: string }
  | { type: 'no' }
  | { type: 'partial'; label: string }
  | { type: 'text'; label: string };

interface FeatureRow {
  feature: string;
  tooltip?: string;
  thumpiks: CellValue;
  competitors: CellValue;
  designTools: CellValue;
  generalAI: CellValue;
}

interface FeatureGroup {
  category: string;
  icon: React.ReactNode;
  rows: FeatureRow[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const featureGroups: FeatureGroup[] = [
  {
    category: 'AI Thumbnail Generation',
    icon: <Wand2 className="w-5 h-5" />,
    rows: [
      {
        feature: 'Text-to-Image Generation',
        thumpiks: { type: 'yes' },
        competitors: { type: 'yes' },
        designTools: { type: 'partial', label: 'Template-based' },
        generalAI: { type: 'yes' },
      },
      {
        feature: 'Style Presets (Cinematic, Gaming, Bold, etc.)',
        thumpiks: { type: 'yes', label: '6+ presets' },
        competitors: { type: 'partial', label: 'Limited' },
        designTools: { type: 'partial', label: 'Templates only' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Multi-Model Tiers (Flash / Standard / Pro)',
        tooltip: 'Choose between speed-optimized or quality-optimized AI models',
        thumpiks: { type: 'yes', label: '3 tiers' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'partial', label: 'Separate tools' },
      },
      {
        feature: 'YouTube-Optimized Output (1280×720)',
        thumpiks: { type: 'yes' },
        competitors: { type: 'yes' },
        designTools: { type: 'partial', label: 'Manual resize' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Thumbnail Recreation from URL',
        tooltip: 'Upload or paste a thumbnail URL and get an improved AI version',
        thumpiks: { type: 'yes' },
        competitors: { type: 'yes' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
    ],
  },
  {
    category: 'AI Photo Editing Suite (7 Tools)',
    icon: <PenTool className="w-5 h-5" />,
    rows: [
      {
        feature: 'AI Inpainting (Edit Specific Areas)',
        tooltip: 'Select any area and describe what you want — AI fills it in',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'partial', label: 'Pro only' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Background Removal (One-Click)',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'partial', label: 'Pro only' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'AI Upscaling (2x & 4x)',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'AI Enhancement (Sharpen, Denoise, HDR, Color)',
        thumpiks: { type: 'yes', label: '5 modes' },
        competitors: { type: 'no' },
        designTools: { type: 'partial', label: 'Basic filters' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'AI Expand / Outpaint',
        tooltip: 'Extend canvas in any direction with AI-generated content',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'partial', label: 'Pro only' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'AI Object Removal',
        tooltip: 'Click any object to select and erase it — AI fills the gap',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'partial', label: 'Pro only' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Recreate Better (Vision + Regenerate)',
        tooltip: 'AI analyzes your old thumbnail and creates an improved version',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Recreate only' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
    ],
  },
  {
    category: 'Advanced AI Features',
    icon: <Sparkles className="w-5 h-5" />,
    rows: [
      {
        feature: 'AI Face Swap',
        tooltip: 'Seamlessly swap faces between images for consistent branding',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Some tools' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Auto-Layer Decompose (SAM 2)',
        tooltip: 'AI splits any image into editable transparent layers instantly',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'AI Smart Text (GPT-4.1, 5 Tones)',
        tooltip: 'Generate click-worthy titles with professional, casual, dramatic, humorous, or clickbait tones',
        thumpiks: { type: 'yes', label: '5 tones' },
        competitors: { type: 'partial', label: 'Basic' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'CTR Score & Vision Analysis',
        tooltip: 'AI analyzes your thumbnail for face, text, color, composition, and emotion scoring',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Basic score' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Visual Similarity Search (Vector-Powered)',
        tooltip: 'Search by image or description — find similar thumbnails in your niche',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Video Frame Extraction (1000+ Platforms)',
        tooltip: 'Paste a video link — extract the perfect frame from YouTube, TikTok, Twitch, and more',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'A/B Testing with CTR Tracking',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Brand Kit (Logo, Colors, Fonts, AI Wizard)',
        tooltip: 'Save brand assets and extract branding from any URL with AI',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'partial', label: 'Pro only' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Trending Insights (YouTube Trends by Region)',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Basic' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
    ],
  },
  {
    category: 'Editors & Workflow',
    icon: <Palette className="w-5 h-5" />,
    rows: [
      {
        feature: 'Full Layer-Based Canvas Editor',
        tooltip: 'Professional editor with layers, smart guides, adjustments, and blending modes',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'yes' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Quick Editor (Speed Mode)',
        tooltip: 'Idea to finished thumbnail in under a minute — paste, generate, or upload',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Basic' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'AI Command Bar (Ctrl+K)',
        tooltip: 'Natural language commands to control the editor — like Spotlight for thumbnails',
        thumpiks: { type: 'yes' },
        competitors: { type: 'no' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Platform Preview Overlay (YouTube, TikTok)',
        tooltip: 'See exactly how your thumbnail looks in YouTube search results before publishing',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Basic' },
        designTools: { type: 'no' },
        generalAI: { type: 'no' },
      },
      {
        feature: 'Multi-Format Export (PNG, JPG, WebP, 4K)',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'PNG only' },
        designTools: { type: 'yes' },
        generalAI: { type: 'partial', label: 'PNG/JPG' },
      },
      {
        feature: 'Team Collaboration',
        thumpiks: { type: 'yes' },
        competitors: { type: 'partial', label: 'Select tools' },
        designTools: { type: 'partial', label: 'Pro/Team plans' },
        generalAI: { type: 'no' },
      },
    ],
  },
  {
    category: 'Pricing & Value',
    icon: <DollarSign className="w-5 h-5" />,
    rows: [
      {
        feature: 'Free Tier Available',
        thumpiks: { type: 'yes', label: '150 credits' },
        competitors: { type: 'partial', label: 'Varies' },
        designTools: { type: 'yes', label: 'Limited' },
        generalAI: { type: 'yes', label: 'Limited' },
      },
      {
        feature: 'Starting Price (Paid)',
        thumpiks: { type: 'text', label: '$19/mo' },
        competitors: { type: 'text', label: '$14–29/mo' },
        designTools: { type: 'text', label: '$10–15/mo' },
        generalAI: { type: 'text', label: '$10–20/mo' },
      },
      {
        feature: 'Cost per Thumbnail',
        thumpiks: { type: 'text', label: '$0.20–$0.80' },
        competitors: { type: 'text', label: '$0.15–$1.00' },
        designTools: { type: 'text', label: 'N/A (time cost)' },
        generalAI: { type: 'text', label: '$0.10–$0.50' },
      },
      {
        feature: 'No Watermarks (Paid Plans)',
        thumpiks: { type: 'yes' },
        competitors: { type: 'yes' },
        designTools: { type: 'partial', label: 'Pro only' },
        generalAI: { type: 'yes' },
      },
    ],
  },
];

// Count totals
const totalFeatures = featureGroups.reduce((sum, g) => sum + g.rows.length, 0);
const countYes = (key: 'thumpiks' | 'competitors' | 'designTools' | 'generalAI') =>
  featureGroups.reduce(
    (sum, g) => sum + g.rows.filter((r) => r[key].type === 'yes').length,
    0
  );

const faqItems = [
  {
    question: 'What makes ThumPiks different from other AI thumbnail makers?',
    answer:
      'ThumPiks is the most feature-complete YouTube thumbnail platform available. It combines AI image generation with a full photo editing suite (7 AI tools), face swap, auto-layer decomposition, CTR analysis with vision scoring, visual similarity search, video frame extraction from 1000+ platforms, A/B testing, brand kit management, and trending insights — all in one platform. Most alternatives only offer generation and basic editing.',
  },
  {
    question: 'Does ThumPiks have a free tier?',
    answer:
      'Yes. ThumPiks offers a free tier with 150 credits, which is enough to create multiple thumbnails and try every AI tool. No credit card required to start. Paid plans start at $19/month with more credits, higher resolutions, and watermark-free exports.',
  },
  {
    question: 'How many AI tools does ThumPiks include?',
    answer:
      'ThumPiks includes 12+ AI-powered tools: image generation (with 3 model tiers), inpainting, background removal, upscaling (2x/4x), enhancement (5 modes), expand/outpaint, object removal, recreate better, face swap, auto-layer decompose (SAM 2), AI smart text (GPT-4.1 with 5 tones), and vision & CTR analysis. Plus a full brand kit with AI wizard, A/B testing, video frame extraction, visual similarity search, and trending insights.',
  },
  {
    question: 'Can I extract frames from YouTube videos for thumbnails?',
    answer:
      'Yes. ThumPiks includes a built-in video frame extraction tool that works with YouTube, TikTok, Twitch, Instagram, and 1000+ platforms. Paste a video link, and ThumPiks extracts high-quality frames you can use as your thumbnail base — then enhance them with any of the AI editing tools.',
  },
  {
    question: 'Does ThumPiks offer a professional editor or just AI generation?',
    answer:
      'ThumPiks offers two editors: a Quick Editor for speed (idea to thumbnail in under a minute) and a Full Canvas Editor with layers, smart guides, adjustments, blending modes, and platform preview overlays. Both editors integrate all AI tools and include an AI Command Bar (Ctrl+K) for natural language editing commands.',
  },
  {
    question: 'How does ThumPiks CTR analysis work?',
    answer:
      'ThumPiks uses Gemini vision AI to analyze your thumbnail across multiple dimensions: face detection, text readability, color composition, emotional impact, and overall attention scoring. You get a CTR prediction score with specific, actionable suggestions to improve your thumbnail before publishing.',
  },
  {
    question: 'What is visual similarity search?',
    answer:
      'Visual similarity search is a vector-powered tool that lets you find thumbnails similar to yours — or describe what you want and AI finds matches. It helps you discover competing thumbnail styles in your niche so you can stand out while understanding what performs well.',
  },
  {
    question: 'Does ThumPiks support A/B testing thumbnails?',
    answer:
      'Yes. ThumPiks has built-in A/B testing that lets you compare thumbnail variants side-by-side with click-through rate tracking. You can test up to 5 variants per test to find which design drives the most clicks, with data-backed results instead of guesswork.',
  },
  {
    question: 'Is ThumPiks suitable for YouTube creators who upload frequently?',
    answer:
      'Absolutely. ThumPiks is built for creators who need speed and consistency. The Quick Editor gets you from idea to finished thumbnail in under 60 seconds. Video frame extraction, AI generation, brand kit presets, and templates let you maintain a consistent channel aesthetic while producing thumbnails fast. Higher-tier plans offer more credits and priority processing for high-volume creators.',
  },
  {
    question: 'How does the AI Command Bar work?',
    answer:
      'Press Ctrl+K in either editor to open the AI Command Bar. Type natural language instructions like "add bold red text saying VIRAL" or "remove the background" and AI executes the command directly. It supports 15+ action types including text, shapes, AI operations, and layer management — like having a design assistant at your fingertips.',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  useEffect(() => {
    document.title =
      'ThumPiks vs Other Thumbnail Makers — Full Feature Comparison (2026)';

    // JSON-LD Structured Data for SEO, AIO, GEO
    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline:
            'ThumPiks vs Other YouTube Thumbnail Makers: Complete Feature Comparison 2026',
          description:
            'Compare ThumPiks against the combined features of other AI thumbnail maker sites, design platforms, and general AI generators. See which platform offers the most features for YouTube creators including AI editing, face swap, CTR analysis, and more.',
          datePublished: '2026-04-13',
          dateModified: '2026-04-13',
          author: {
            '@type': 'Organization',
            name: 'ThumPiks',
            url: 'https://thumpiks.com',
          },
          publisher: {
            '@type': 'Organization',
            name: 'ThumPiks',
            url: 'https://thumpiks.com',
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': 'https://thumpiks.com/compare',
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        },
        {
          '@type': 'SoftwareApplication',
          name: 'ThumPiks',
          applicationCategory: 'DesignApplication',
          operatingSystem: 'Web',
          description:
            'AI-powered YouTube thumbnail maker with 12+ AI tools, two editors, face swap, CTR analysis, video frame extraction, and more.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free tier with 150 credits. Paid plans from $19/month.',
          },
          featureList: [
            'AI Image Generation',
            'AI Inpainting',
            'Background Removal',
            'AI Upscaling',
            'AI Enhancement',
            'AI Expand/Outpaint',
            'Object Removal',
            'Recreate Better',
            'Face Swap',
            'Auto-Layer Decompose',
            'AI Smart Text',
            'CTR Score & Vision Analysis',
            'Visual Similarity Search',
            'Video Frame Extraction',
            'A/B Testing',
            'Brand Kit',
            'Trending Insights',
            'Layer-Based Canvas Editor',
            'Quick Editor',
            'AI Command Bar',
            'Platform Preview Overlay',
            'Multi-Format Export',
            'Team Collaboration',
          ],
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    script.id = 'compare-page-jsonld';
    document.head.appendChild(script);

    // Meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc?.getAttribute('content') || '';
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Compare ThumPiks to the combined features of other AI thumbnail maker sites. See 31 features side-by-side including AI editing, face swap, CTR analysis, video frame extraction, A/B testing, and more — no competitor names, just real data.'
    );

    return () => {
      document.getElementById('compare-page-jsonld')?.remove();
      if (metaDesc) metaDesc.setAttribute('content', originalDesc);
    };
  }, []);

  const renderCell = (value: CellValue) => {
    switch (value.type) {
      case 'yes':
        return (
          <div className="flex flex-col items-center gap-1">
            <Check className="w-5 h-5 text-green-500" />
            {value.label && (
              <span className="text-xs text-green-400">{value.label}</span>
            )}
          </div>
        );
      case 'no':
        return <X className="w-5 h-5 text-gray-600 mx-auto" />;
      case 'partial':
        return (
          <div className="flex flex-col items-center gap-1">
            <Minus className="w-5 h-5 text-yellow-500" />
            <span className="text-xs text-yellow-400/80">{value.label}</span>
          </div>
        );
      case 'text':
        return (
          <span className="text-sm text-gray-300 font-medium">
            {value.label}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="w-6 h-6 bg-white rounded"></div>
            <span>ThumPiks</span>
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/features')}
              className="text-gray-400 hover:text-white transition-colors hidden sm:block"
            >
              All Features
            </button>
            <button
              onClick={() => navigate('/')}
              className="hidden sm:inline-flex text-gray-400 hover:text-white transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-600 hover:bg-blue-700 px-4 sm:px-6 py-2 rounded-lg transition-colors text-sm sm:text-base"
            >
              Start Free
            </button>
          </div>
        </div>
      </header>

      {/* Hero — Answer-First for AIO/GEO */}
      <section className="pt-12 sm:pt-16 pb-10 sm:pb-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-600/30 rounded-full px-4 py-2 mb-8">
            <BarChart className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400">
              Feature-by-Feature Comparison
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light mb-6">
            How <span className="text-blue-500">ThumPiks</span> Compares
            <br />
            <span className="text-gray-400 text-xl sm:text-3xl md:text-4xl">
              to Other YouTube Thumbnail Makers
            </span>
          </h1>

          {/* Answer-first paragraph for AIO citation */}
          <p className="text-lg text-gray-300 mb-6 max-w-3xl mx-auto leading-relaxed">
            <strong className="text-white">
              ThumPiks is the most feature-complete AI thumbnail platform for
              YouTube creators.
            </strong>{' '}
            With {totalFeatures} capabilities compared across four categories of
            tools, ThumPiks offers{' '}
            <span className="text-green-400 font-semibold">
              {countYes('thumpiks')} features
            </span>{' '}
            — including 12+ AI tools, two professional editors, face swap, CTR
            vision analysis, video frame extraction, A/B testing, and more.
            Other AI thumbnail maker sites — combined — typically cover{' '}
            {countYes('competitors')} of these features, general design platforms{' '}
            {countYes('designTools')}, and general AI generators{' '}
            {countYes('generalAI')}.
          </p>

          <p className="text-gray-500 text-sm">
            Last updated: April 2026 • Based on publicly available feature lists
            and independent testing
          </p>
        </div>
      </section>

      {/* Quick Verdict Cards */}
      <section className="pb-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'ThumPiks',
              count: countYes('thumpiks'),
              total: totalFeatures,
              color: 'blue',
              highlight: true,
            },
            {
              label: 'Other AI Thumbnail Maker Sites',
              count: countYes('competitors'),
              total: totalFeatures,
              color: 'gray',
              highlight: false,
            },
            {
              label: 'General Design Platforms',
              count: countYes('designTools'),
              total: totalFeatures,
              color: 'gray',
              highlight: false,
            },
            {
              label: 'General AI Generators',
              count: countYes('generalAI'),
              total: totalFeatures,
              color: 'gray',
              highlight: false,
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl p-5 text-center ${
                item.highlight
                  ? 'bg-blue-600/10 border-2 border-blue-500/50'
                  : 'bg-gray-900/50 border border-gray-800'
              }`}
            >
              <div
                className={`text-3xl font-bold mb-1 ${
                  item.highlight ? 'text-blue-400' : 'text-gray-400'
                }`}
              >
                {item.count}
                <span className="text-lg text-gray-600">/{item.total}</span>
              </div>
              <div
                className={`text-sm ${
                  item.highlight ? 'text-blue-300' : 'text-gray-500'
                }`}
              >
                {item.label}
              </div>
              {/* Feature coverage bar */}
              <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    item.highlight ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                  style={{
                    width: `${Math.round((item.count / item.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Comparison Table */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-900/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light text-center mb-4">
            Complete Feature <span className="text-blue-500">Comparison</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            {totalFeatures} features compared — ThumPiks vs. the combined
            offerings of other AI thumbnail maker sites, design platforms, and
            AI generators. No names — just what they actually offer.
          </p>

          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="min-w-[800px]">
              {/* Table Header */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-t-2xl">
                <div className="grid grid-cols-[1fr_140px_140px_140px_140px] gap-0">
                  <div className="p-5 text-gray-400 text-sm font-medium">
                    Feature
                  </div>
                  <div className="p-5 text-center border-l border-gray-800">
                    <div className="flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-sm text-white">
                        ThumPiks
                      </span>
                    </div>
                  </div>
                  <div className="p-5 text-center text-gray-400 text-sm border-l border-gray-800">
                    Other AI Thumbnail
                    <br />
                    Maker Sites
                  </div>
                  <div className="p-5 text-center text-gray-400 text-sm border-l border-gray-800">
                    General
                    <br />
                    Design Tools
                  </div>
                  <div className="p-5 text-center text-gray-400 text-sm border-l border-gray-800">
                    General AI
                    <br />
                    Generators
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="border-x border-b border-gray-800 rounded-b-2xl overflow-hidden">
                {featureGroups.map((group, gi) => (
                  <React.Fragment key={gi}>
                    {/* Category Header */}
                    <div className="bg-gray-800/50 px-5 py-3 flex items-center gap-2 border-t border-gray-800">
                      <span className="text-blue-400">{group.icon}</span>
                      <h3 className="font-semibold text-sm text-white">
                        {group.category}
                      </h3>
                    </div>

                    {/* Feature Rows */}
                    {group.rows.map((row, ri) => (
                      <div
                        key={ri}
                        className={`grid grid-cols-[1fr_140px_140px_140px_140px] gap-0 ${
                          ri < group.rows.length - 1
                            ? 'border-b border-gray-800/50'
                            : ''
                        } hover:bg-gray-800/20 transition-colors`}
                      >
                        <div className="px-5 py-4 flex items-center gap-2">
                          <span className="text-sm text-gray-300">
                            {row.feature}
                          </span>
                          {row.tooltip && (
                            <span
                              className="text-gray-600 cursor-help"
                              title={row.tooltip}
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="px-3 py-4 flex items-center justify-center border-l border-gray-800/50 bg-blue-600/5">
                          {renderCell(row.thumpiks)}
                        </div>
                        <div className="px-3 py-4 flex items-center justify-center border-l border-gray-800/50">
                          {renderCell(row.competitors)}
                        </div>
                        <div className="px-3 py-4 flex items-center justify-center border-l border-gray-800/50">
                          {renderCell(row.designTools)}
                        </div>
                        <div className="px-3 py-4 flex items-center justify-center border-l border-gray-800/50">
                          {renderCell(row.generalAI)}
                        </div>
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            "Other AI Thumbnail Maker Sites" = combined features available across
            leading AI thumbnail maker websites (no single tool offers all).
            "General Design Tools" = drag-and-drop editors with template
            libraries. "General AI Generators" = text-to-image AI services
            not optimized for thumbnails.
          </p>
        </div>
      </section>

      {/* Feature Highlights — Deep Dives */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light text-center mb-4">
            What Sets ThumPiks{' '}
            <span className="text-blue-500">Apart</span>
          </h2>
          <p className="text-gray-400 text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
            Features you won't find in other thumbnail tools
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: <PenTool className="w-6 h-6" />,
                title: '7-Tool AI Photo Editing Suite',
                description:
                  'Most thumbnail tools stop at generation. ThumPiks includes inpainting, background removal, upscaling (2x/4x), enhancement (5 modes), expand/outpaint, object removal, and recreate better — a complete Photoshop replacement powered by AI.',
                exclusive: true,
              },
              {
                icon: <Layers className="w-6 h-6" />,
                title: 'Auto-Layer Decompose (SAM 2)',
                description:
                  'AI splits any image into individually editable transparent layers. Separate people, objects, and backgrounds instantly — getting Photoshop-level layer control without the learning curve.',
                exclusive: true,
              },
              {
                icon: <Eye className="w-6 h-6" />,
                title: 'Vision & CTR Analysis',
                description:
                  'Gemini AI analyzes your thumbnail across face detection, text readability, color composition, emotional impact, and attention scoring. Get a predicted CTR score with specific improvement suggestions.',
                exclusive: true,
              },
              {
                icon: <Search className="w-6 h-6" />,
                title: 'Visual Similarity Search',
                description:
                  'Vector-powered search that finds thumbnails similar to yours by image or text description. Discover what competitors in your niche are doing and make sure your thumbnail stands out.',
                exclusive: true,
              },
              {
                icon: <Video className="w-6 h-6" />,
                title: 'Video Frame Extraction',
                description:
                  'Paste a link from YouTube, TikTok, Twitch, Instagram, or 1000+ platforms. ThumPiks extracts high-quality frames you can use as thumbnail bases, then enhance with any AI tool.',
                exclusive: true,
              },
              {
                icon: <Command className="w-6 h-6" />,
                title: 'AI Command Bar (Ctrl+K)',
                description:
                  'Type natural language commands like "add bold red text" or "remove the background" and the editor executes them. Supports 15+ action types — text, shapes, AI operations, and layer management.',
                exclusive: true,
              },
              {
                icon: <BarChart className="w-6 h-6" />,
                title: 'Built-in A/B Testing',
                description:
                  'Compare up to 5 thumbnail variants with click-through rate tracking. Data-driven thumbnail optimization instead of guesswork — built right into the platform.',
                exclusive: true,
              },
              {
                icon: <Monitor className="w-6 h-6" />,
                title: 'Two Professional Editors',
                description:
                  'Quick Editor for speed (under 60 seconds from idea to thumbnail) and Full Canvas Editor for precision (layers, smart guides, adjustments, blending modes, platform preview overlays).',
                exclusive: false,
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 sm:p-7 hover:border-blue-600/30 transition-colors"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{feature.title}</h3>
                      {feature.exclusive && (
                        <span className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-full px-2 py-0.5">
                          Unique
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Should Use What */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gray-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light text-center mb-4">
            Which Tool Type Is{' '}
            <span className="text-blue-500">Right for You?</span>
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Honest guidance based on your situation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-600/5 border-2 border-blue-500/30 rounded-2xl p-5 sm:p-7">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-lg">
                  Choose ThumPiks if you want...
                </h3>
              </div>
              <ul className="space-y-3">
                {[
                  'The most AI tools in a single thumbnail platform',
                  'Professional editing without learning Photoshop',
                  'CTR prediction and data-driven optimization',
                  'Video frame extraction from any platform',
                  'Face swap for consistent channel branding',
                  'Built-in A/B testing for thumbnails',
                  'Both quick and precision editing workflows',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-gray-300">
                  Consider other AI thumbnail makers if...
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" />
                    You only need basic generation and recreation (no editing suite)
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" />
                    You have a very low budget and limited needs
                  </li>
                </ul>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-gray-300">
                  Consider design tools if...
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" />
                    You need thumbnails AND other graphic design (presentations,
                    social posts)
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" />
                    You prefer manual template-based design over AI generation
                  </li>
                </ul>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h3 className="font-semibold mb-3 text-gray-300">
                  Consider general AI generators if...
                </h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" />
                    You want artistic AI images for many purposes beyond
                    thumbnails
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="w-3.5 h-3.5 mt-1 flex-shrink-0" />
                    You're comfortable with prompt engineering and manual
                    post-processing
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section — Critical for AIO/GEO */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-light text-center mb-4">
            Frequently Asked{' '}
            <span className="text-blue-500">Questions</span>
          </h2>
          <p className="text-gray-400 text-center mb-12">
            Everything you need to know about how ThumPiks compares
          </p>

          <div className="space-y-3">
            {faqItems.map((faq, i) => (
              <div
                key={i}
                className="border border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-900/50 transition-colors"
                >
                  <h3 className="font-medium text-sm pr-4">{faq.question}</h3>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-600/50 rounded-3xl p-6 sm:p-12 md:p-16 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light mb-6">
              See the Difference
              <br />
              <span className="text-blue-500">for Yourself</span>
            </h2>
            <p className="text-gray-300 text-lg mb-4 max-w-xl mx-auto">
              Try every feature free — 150 credits, no credit card required.
              Create your first AI thumbnail in under 30 seconds.
            </p>
            <p className="text-gray-500 text-sm mb-10">
              {totalFeatures} features. 12+ AI tools. Two editors. One platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                Start Free <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/features')}
                className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-lg text-lg font-medium transition-colors"
              >
                View All Features
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center text-gray-500 text-sm">
          <p>
            © {new Date().getFullYear()} ThumPiks LLC. All rights reserved.
          </p>
          <p className="mt-2 text-gray-600 text-xs">
            Feature data based on publicly available product pages and
            independent testing of leading AI thumbnail maker sites as of
            April 2026. The "Other AI Thumbnail Maker Sites" column represents
            the combined best offerings across multiple competitor sites —
            no single tool offers all features shown.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ComparePage;
