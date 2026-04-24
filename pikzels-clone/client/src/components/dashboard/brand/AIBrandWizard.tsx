import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  Palette,
  Check,
  Loader2,
  Zap,
  Heart,
  Shield,
  Lightbulb,
  Target,
  Users,
  Rocket,
  Leaf,
  Crown,
  Star,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────

export interface AIBrandWizardData {
  brandName: string;
  tagline?: string;
  industry: string;
  stylePreferences: string[];
  colorPreferences: string[];
  brandPersonality: string[];
  targetAudience?: string;
}

interface AIBrandWizardProps {
  onComplete: (data: AIBrandWizardData) => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

type WizardStep = 'brand-info' | 'industry' | 'style' | 'colors' | 'personality' | 'review';

// ── Config Data ───────────────────────────────────────────────────────

const industries = [
  { id: 'technology', label: 'Technology & Software', icon: Zap },
  { id: 'creative', label: 'Creative & Design', icon: Sparkles },
  { id: 'healthcare', label: 'Healthcare & Wellness', icon: Heart },
  { id: 'finance', label: 'Finance & Business', icon: Shield },
  { id: 'education', label: 'Education & Learning', icon: Lightbulb },
  { id: 'retail', label: 'Retail & E-commerce', icon: Target },
  { id: 'services', label: 'Professional Services', icon: Users },
  { id: 'startup', label: 'Startup & Innovation', icon: Rocket },
  { id: 'sustainability', label: 'Sustainability & Green', icon: Leaf },
  { id: 'luxury', label: 'Luxury & Premium', icon: Crown },
  { id: 'entertainment', label: 'Entertainment & Media', icon: Star },
  { id: 'other', label: 'Other', icon: Building2 },
];

const styleOptions = [
  { id: 'minimal', label: 'Minimal & Clean', description: 'Simple, lots of whitespace' },
  { id: 'bold', label: 'Bold & Dynamic', description: 'Strong colors, impactful' },
  { id: 'elegant', label: 'Elegant & Refined', description: 'Sophisticated, premium' },
  { id: 'playful', label: 'Playful & Fun', description: 'Vibrant, approachable' },
  { id: 'professional', label: 'Professional & Corporate', description: 'Trustworthy, established' },
  { id: 'modern', label: 'Modern & Trendy', description: 'Contemporary, cutting-edge' },
  { id: 'vintage', label: 'Vintage & Classic', description: 'Timeless, nostalgic' },
  { id: 'organic', label: 'Organic & Natural', description: 'Earthy, sustainable' },
];

const colorPalettes = [
  { id: 'blue', label: 'Trust Blue', colors: ['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'] },
  { id: 'purple', label: 'Creative Purple', colors: ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD'] },
  { id: 'green', label: 'Growth Green', colors: ['#059669', '#10B981', '#34D399', '#6EE7B7'] },
  { id: 'orange', label: 'Energy Orange', colors: ['#EA580C', '#F97316', '#FB923C', '#FDBA74'] },
  { id: 'red', label: 'Bold Red', colors: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5'] },
  { id: 'teal', label: 'Fresh Teal', colors: ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4'] },
  { id: 'pink', label: 'Vibrant Pink', colors: ['#DB2777', '#EC4899', '#F472B6', '#F9A8D4'] },
  { id: 'neutral', label: 'Elegant Neutral', colors: ['#1F2937', '#4B5563', '#9CA3AF', '#D1D5DB'] },
];

const personalityTraits = [
  { id: 'innovative', label: 'Innovative', emoji: '💡' },
  { id: 'trustworthy', label: 'Trustworthy', emoji: '🤝' },
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'bold', label: 'Bold', emoji: '🔥' },
  { id: 'luxurious', label: 'Luxurious', emoji: '✨' },
  { id: 'sustainable', label: 'Sustainable', emoji: '🌱' },
  { id: 'youthful', label: 'Youthful', emoji: '🚀' },
  { id: 'authoritative', label: 'Authoritative', emoji: '👑' },
];

// ── Component ─────────────────────────────────────────────────────────

const AIBrandWizard: React.FC<AIBrandWizardProps> = ({ onComplete, onCancel, isGenerating }) => {
  const [step, setStep] = useState<WizardStep>('brand-info');
  const [data, setData] = useState<AIBrandWizardData>({
    brandName: '',
    tagline: '',
    industry: '',
    stylePreferences: [],
    colorPreferences: [],
    brandPersonality: [],
    targetAudience: '',
  });

  const steps: WizardStep[] = ['brand-info', 'industry', 'style', 'colors', 'personality', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = (): boolean => {
    switch (step) {
      case 'brand-info':
        return data.brandName.trim().length >= 2;
      case 'industry':
        return !!data.industry;
      case 'style':
        return data.stylePreferences.length >= 1;
      case 'colors':
        return data.colorPreferences.length >= 1;
      case 'personality':
        return data.brandPersonality.length >= 2;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]!);
    }
  };

  const prevStep = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) {
      setStep(steps[idx - 1]!);
    }
  };

  const toggleArrayItem = (key: 'stylePreferences' | 'colorPreferences' | 'brandPersonality', value: string) => {
    setData(prev => {
      const arr = prev[key];
      if (arr.includes(value)) {
        return { ...prev, [key]: arr.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...arr, value] };
    });
  };

  const handleSubmit = () => {
    onComplete(data);
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStepIndex ? 'bg-purple-500' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {/* Step 1: Brand Info */}
        {step === 'brand-info' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-slate-100">Tell us about your brand</h3>
              <p className="text-sm text-slate-400 mt-2">We'll use this to generate personalized brand assets</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Brand Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={data.brandName}
                  onChange={(e) => setData(prev => ({ ...prev, brandName: e.target.value }))}
                  placeholder="e.g., Acme Inc."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tagline <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={data.tagline}
                  onChange={(e) => setData(prev => ({ ...prev, tagline: e.target.value }))}
                  placeholder="e.g., Innovation meets simplicity"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Audience <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={data.targetAudience}
                  onChange={(e) => setData(prev => ({ ...prev, targetAudience: e.target.value }))}
                  placeholder="e.g., Small business owners, tech enthusiasts"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Industry */}
        {step === 'industry' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100">What industry are you in?</h3>
              <p className="text-sm text-slate-400 mt-2">This helps us suggest relevant styles and colors</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {industries.map((industry) => {
                const IconComponent = industry.icon;
                const isSelected = data.industry === industry.id;
                return (
                  <button
                    key={industry.id}
                    onClick={() => setData(prev => ({ ...prev, industry: industry.id }))}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                    <span className="text-sm font-medium">{industry.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Style */}
        {step === 'style' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100">What styles appeal to you?</h3>
              <p className="text-sm text-slate-400 mt-2">Select 1-3 styles that match your vision</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {styleOptions.map((style) => {
                const isSelected = data.stylePreferences.includes(style.id);
                return (
                  <button
                    key={style.id}
                    onClick={() => toggleArrayItem('stylePreferences', style.id)}
                    disabled={!isSelected && data.stylePreferences.length >= 3}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-medium ${isSelected ? 'text-purple-300' : 'text-slate-200'}`}>
                          {style.label}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">{style.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Selected: {data.stylePreferences.length}/3
            </p>
          </div>
        )}

        {/* Step 4: Colors */}
        {step === 'colors' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100">Choose your color direction</h3>
              <p className="text-sm text-slate-400 mt-2">Select 1-2 color palettes that resonate with your brand</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {colorPalettes.map((palette) => {
                const isSelected = data.colorPreferences.includes(palette.id);
                return (
                  <button
                    key={palette.id}
                    onClick={() => toggleArrayItem('colorPreferences', palette.id)}
                    disabled={!isSelected && data.colorPreferences.length >= 2}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${isSelected ? 'text-purple-300' : 'text-slate-300'}`}>
                        {palette.label}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div className="flex gap-1">
                      {palette.colors.map((color, i) => (
                        <div
                          key={i}
                          className="h-8 flex-1 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Selected: {data.colorPreferences.length}/2
            </p>
          </div>
        )}

        {/* Step 5: Personality */}
        {step === 'personality' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-100">Describe your brand personality</h3>
              <p className="text-sm text-slate-400 mt-2">Select 2-4 traits that define your brand</p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              {personalityTraits.map((trait) => {
                const isSelected = data.brandPersonality.includes(trait.id);
                return (
                  <button
                    key={trait.id}
                    onClick={() => toggleArrayItem('brandPersonality', trait.id)}
                    disabled={!isSelected && data.brandPersonality.length >= 4}
                    className={`px-4 py-2 rounded-full border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-slate-700 hover:border-slate-600 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <span>{trait.emoji}</span>
                    <span className="text-sm font-medium">{trait.label}</span>
                    {isSelected && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Selected: {data.brandPersonality.length}/4
            </p>
          </div>
        )}

        {/* Step 6: Review */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-100">Ready to generate your brand!</h3>
              <p className="text-sm text-slate-400 mt-2">Review your selections and let AI create your brand identity</p>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                <span className="text-sm text-slate-400">Brand Name</span>
                <span className="text-sm text-slate-200 font-medium">{data.brandName}</span>
              </div>
              {data.tagline && (
                <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                  <span className="text-sm text-slate-400">Tagline</span>
                  <span className="text-sm text-slate-200 text-right">{data.tagline}</span>
                </div>
              )}
              <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                <span className="text-sm text-slate-400">Industry</span>
                <span className="text-sm text-slate-200">
                  {industries.find(i => i.id === data.industry)?.label}
                </span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                <span className="text-sm text-slate-400">Styles</span>
                <span className="text-sm text-slate-200 text-right">
                  {data.stylePreferences.map(s => styleOptions.find(o => o.id === s)?.label).join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-start border-b border-slate-700 pb-3">
                <span className="text-sm text-slate-400">Colors</span>
                <div className="flex gap-1">
                  {data.colorPreferences.flatMap(p => 
                    colorPalettes.find(c => c.id === p)?.colors.slice(0, 2) || []
                  ).map((color, i) => (
                    <div key={i} className="w-5 h-5 rounded" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-slate-400">Personality</span>
                <span className="text-sm text-slate-200 text-right">
                  {data.brandPersonality.map(p => personalityTraits.find(t => t.id === p)?.label).join(', ')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          onClick={currentStepIndex === 0 ? onCancel : prevStep}
          className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {currentStepIndex === 0 ? 'Cancel' : 'Back'}
        </button>

        {step === 'review' ? (
          <button
            onClick={handleSubmit}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Brand
              </>
            )}
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AIBrandWizard;
