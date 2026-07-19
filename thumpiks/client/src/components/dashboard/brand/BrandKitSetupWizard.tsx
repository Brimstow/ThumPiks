import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Globe,
  PenTool,
  ArrowRight,
  Wand2,
  Link2,
  Palette,
  CheckCircle2,
  Loader2,
  Check,
  Type,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { BrandCategoryType } from './types';
import { useBrandKitFeatures } from '../../../hooks/useFeatureFlags';
import { 
  extractBrandFromUrl, 
  BrandExtractionResult,
  generateBrandWithAI,
  AIBrandGeneratorResult,
  GeneratedBrandSuggestion,
} from '../../../services/brand-kit.service';
import AIBrandWizard, { AIBrandWizardData } from './AIBrandWizard';

type SetupMethod = 'ai-generate' | 'import-url' | 'manual';
type WizardStep = 'choose-method' | 'manual-categories' | 'url-import' | 'ai-generator';

interface BrandKitSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onStartManualSetup: (category: BrandCategoryType) => void;
  onClearSampleData: () => void;
}

interface SetupOption {
  id: SetupMethod;
  icon: React.ElementType;
  title: string;
  description: string;
  featureKey: 'canUseAiGenerator' | 'canUseUrlImport' | 'canUseManualSetup';
  comingSoonLabel?: string;
}

// Setup options configuration
const setupOptionsConfig: SetupOption[] = [
  {
    id: 'ai-generate',
    icon: Wand2,
    title: 'AI Brand Generator',
    description: 'Describe your brand and let AI create logos, colors, fonts, and more for you.',
    featureKey: 'canUseAiGenerator',
    comingSoonLabel: 'Coming Soon',
  },
  {
    id: 'import-url',
    icon: Link2,
    title: 'Import from Website',
    description: 'Enter your website URL and we\'ll extract your brand colors, logos, and fonts automatically.',
    featureKey: 'canUseUrlImport',
    comingSoonLabel: 'Coming Soon',
  },
  {
    id: 'manual',
    icon: PenTool,
    title: 'Manual Setup',
    description: 'Upload your existing brand assets and configure your brand kit step by step.',
    featureKey: 'canUseManualSetup',
  },
];

const manualSetupCategories: { id: BrandCategoryType; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'logos', label: 'Logos', icon: Sparkles, description: 'Upload your brand logos' },
  { id: 'colors', label: 'Colors', icon: Palette, description: 'Define your brand colors' },
  { id: 'fonts', label: 'Fonts', icon: PenTool, description: 'Add your brand fonts' },
  { id: 'brand-voice', label: 'Brand Voice', icon: Globe, description: 'Set your brand tone' },
];

const BrandKitSetupWizard: React.FC<BrandKitSetupWizardProps> = ({
  isOpen,
  onClose,
  onStartManualSetup,
  onClearSampleData,
}) => {
  const features = useBrandKitFeatures();
  const [selectedMethod, setSelectedMethod] = useState<SetupMethod | null>(null);
  const [step, setStep] = useState<WizardStep>('choose-method');
  
  // URL Import state
  const [importUrl, setImportUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<BrandExtractionResult | null>(null);

  // AI Generator state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [generatorResult, setGeneratorResult] = useState<AIBrandGeneratorResult | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<GeneratedBrandSuggestion | null>(null);

  // Build setup options with feature flag status
  const setupOptions = setupOptionsConfig.map(option => ({
    ...option,
    available: features[option.featureKey],
    badge: !features[option.featureKey] ? option.comingSoonLabel : undefined,
  }));

  const handleMethodSelect = (method: SetupMethod) => {
    const option = setupOptions.find(o => o.id === method);
    if (!option?.available) return;
    
    setSelectedMethod(method);
    
    switch (method) {
      case 'manual':
        setStep('manual-categories');
        break;
      case 'import-url':
        setStep('url-import');
        break;
      case 'ai-generate':
        setStep('ai-generator');
        break;
    }
  };

  const handleCategorySelect = (category: BrandCategoryType) => {
    onClearSampleData();
    onStartManualSetup(category);
    handleClose();
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setStep('choose-method');
    setImportUrl('');
    setExtractionError(null);
    setExtractionResult(null);
    setGeneratorError(null);
    setGeneratorResult(null);
    setSelectedSuggestion(null);
    onClose();
  };

  const handleBack = () => {
    if (step === 'url-import' || step === 'ai-generator') {
      setStep('choose-method');
      setSelectedMethod(null);
      setImportUrl('');
      setExtractionError(null);
      setExtractionResult(null);
      setGeneratorError(null);
      setGeneratorResult(null);
      setSelectedSuggestion(null);
    } else {
      setStep('choose-method');
      setSelectedMethod(null);
    }
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    
    // Ensure URL has protocol
    let urlToExtract = importUrl.trim();
    if (!urlToExtract.startsWith('http://') && !urlToExtract.startsWith('https://')) {
      urlToExtract = 'https://' + urlToExtract;
    }
    
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionResult(null);
    
    try {
      const result = await extractBrandFromUrl(urlToExtract);
      setExtractionResult(result);
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : 'Failed to extract brand from URL');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImportExtractedBrand = () => {
    // Partial implementation: clears sample data and closes wizard.
    // Full import via API will be added when brand-kit import endpoint is ready.
    onClearSampleData();
    handleClose();
  };

  // AI Brand Generator handlers
  const handleAIGenerate = async (data: AIBrandWizardData) => {
    setIsGenerating(true);
    setGeneratorError(null);
    setGeneratorResult(null);
    
    try {
      const result = await generateBrandWithAI(data);
      setGeneratorResult(result);
    } catch (err) {
      setGeneratorError(err instanceof Error ? err.message : 'Failed to generate brand suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSuggestion = (suggestion: GeneratedBrandSuggestion) => {
    setSelectedSuggestion(suggestion);
  };

  const handleImportSuggestion = () => {
    // Partial implementation: clears sample data and closes wizard.
    // Full import via API will be added when brand-kit import endpoint is ready.
    onClearSampleData();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {step !== 'choose-method' && (
              <button
                onClick={handleBack}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {step === 'choose-method' && 'Set Up Your Brand Kit'}
                {step === 'manual-categories' && 'Choose Where to Start'}
                {step === 'url-import' && 'Import from Website'}
                {step === 'ai-generator' && 'AI Brand Generator'}
              </h2>
              <p className="text-sm text-slate-400">
                {step === 'choose-method' && 'Choose how you\'d like to create your brand kit'}
                {step === 'manual-categories' && 'Select a category to begin adding your brand assets'}
                {step === 'url-import' && 'Enter your website URL to extract brand assets'}
                {step === 'ai-generator' && 'Answer a few questions to generate your brand identity'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'choose-method' && (
            <div className="space-y-4">
              {setupOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={() => handleMethodSelect(option.id)}
                    disabled={!option.available}
                    className={`w-full p-5 rounded-xl border text-left transition-all group ${
                      option.available
                        ? 'border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 cursor-pointer'
                        : 'border-slate-800 bg-slate-900/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl ${
                          option.available
                            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20'
                            : 'bg-slate-800 border border-slate-700 text-slate-500'
                        } transition-colors`}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3
                            className={`font-semibold ${
                              option.available ? 'text-slate-100' : 'text-slate-400'
                            }`}
                          >
                            {option.title}
                          </h3>
                          {option.badge && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        <p
                          className={`mt-1 text-sm ${
                            option.available ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {option.description}
                        </p>
                      </div>
                      {option.available && (
                        <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 'manual-categories' && (
            <div className="grid grid-cols-2 gap-4">
              {manualSetupCategories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category.id)}
                    className="p-5 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 text-left transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-100">{category.label}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{category.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* URL Import Step */}
          {step === 'url-import' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Website URL
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="w-5 h-5 text-slate-500" />
                    </div>
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="yourwebsite.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={isExtracting}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
                    />
                  </div>
                  <button
                    onClick={handleUrlImport}
                    disabled={!importUrl.trim() || isExtracting}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        Extract
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  We'll analyze your website to extract colors, fonts, and logos automatically.
                </p>
              </div>

              {extractionError && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{extractionError}</p>
                </div>
              )}

              {/* Extraction Results */}
              {extractionResult ? (
                <div className="space-y-5">
                  {/* Screenshot Preview */}
                  {extractionResult.screenshot && (
                    <div className="rounded-xl overflow-hidden border border-slate-700">
                      <img
                        src={extractionResult.screenshot}
                        alt="Website preview"
                        className="w-full h-auto"
                      />
                    </div>
                  )}

                  {/* Metadata */}
                  {extractionResult.metadata.siteName && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Globe className="w-4 h-4 text-slate-500" />
                      <span className="font-medium">{extractionResult.metadata.siteName}</span>
                      <a
                        href={extractionResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-auto flex items-center gap-1 text-sm"
                      >
                        Visit <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Colors */}
                  {extractionResult.colors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-medium text-slate-300">Colors ({extractionResult.colors.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {extractionResult.colors.slice(0, 8).map((color, i) => (
                          <div
                            key={i}
                            className="group relative"
                          >
                            <div
                              className="w-12 h-12 rounded-lg border border-slate-600 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                              style={{ backgroundColor: color.hex }}
                              title={`${color.hex} - ${color.usage}`}
                            />
                            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {color.hex}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fonts */}
                  {extractionResult.fonts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Type className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-medium text-slate-300">Fonts ({extractionResult.fonts.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {extractionResult.fonts.map((font, i) => (
                          <div
                            key={i}
                            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg"
                          >
                            <span className="text-slate-200 font-medium" style={{ fontFamily: font.family }}>
                              {font.family}
                            </span>
                            {font.source && (
                              <span className="ml-2 text-xs text-slate-500">{font.source}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logos */}
                  {extractionResult.logos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-medium text-slate-300">Logos ({extractionResult.logos.length})</h4>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {extractionResult.logos.map((logo, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center overflow-hidden"
                          >
                            <img
                              src={logo.url}
                              alt={`Logo ${i + 1}`}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Import Button */}
                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={handleImportExtractedBrand}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Import Brand Assets
                    </button>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      Assets will be added to your Brand Kit for further customization
                    </p>
                  </div>
                </div>
              ) : (
                /* Placeholder for extraction results */
                <div className="p-8 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 text-center">
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-spin" />
                      <p className="text-slate-300">Analyzing website...</p>
                      <p className="text-xs text-slate-500 mt-1">This may take 10-30 seconds</p>
                    </>
                  ) : (
                    <>
                      <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Enter a URL above to extract brand assets</p>
                      <p className="text-xs text-slate-500 mt-1">Colors, fonts, and logos will appear here</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Generator Step */}
          {step === 'ai-generator' && (
            <div className="space-y-6">
              {generatorError && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{generatorError}</p>
                </div>
              )}

              {!generatorResult ? (
                <AIBrandWizard
                  onComplete={handleAIGenerate}
                  onCancel={handleBack}
                  isGenerating={isGenerating}
                />
              ) : (
                /* Results View */
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-100">Choose Your Brand Direction</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {generatorResult.error ? 'Generated with fallback suggestions' : 'AI-generated brand suggestions based on your preferences'}
                    </p>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {generatorResult.suggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className={`p-5 rounded-xl border cursor-pointer transition-all ${
                          selectedSuggestion?.id === suggestion.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-100">{suggestion.name}</h4>
                            <p className="text-sm text-slate-400 mt-1">{suggestion.description}</p>
                          </div>
                          {selectedSuggestion?.id === suggestion.id && (
                            <Check className="w-5 h-5 text-purple-400" />
                          )}
                        </div>

                        {/* Colors Preview */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex gap-1">
                            {suggestion.colors.map((color, i) => (
                              <div
                                key={i}
                                className="w-8 h-8 rounded"
                                style={{ backgroundColor: color.hex }}
                                title={`${color.name}: ${color.hex}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Fonts Preview */}
                        <div className="flex gap-2 mb-3">
                          {suggestion.fonts.map((font, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300"
                            >
                              {font.name} ({font.usage})
                            </span>
                          ))}
                        </div>

                        {/* Keywords */}
                        <div className="flex flex-wrap gap-1.5">
                          {suggestion.moodKeywords.map((keyword, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-800/50 rounded-full text-xs text-slate-400"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>

                        {/* Voice & Style */}
                        {selectedSuggestion?.id === suggestion.id && (
                          <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                            <p className="text-xs text-slate-500"><strong className="text-slate-400">Voice:</strong> {suggestion.voiceTone}</p>
                            <p className="text-xs text-slate-500"><strong className="text-slate-400">Visual:</strong> {suggestion.visualStyle}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setGeneratorResult(null);
                        setSelectedSuggestion(null);
                      }}
                      className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Start Over
                    </button>
                    <button
                      onClick={handleImportSuggestion}
                      disabled={!selectedSuggestion}
                      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Use This Brand
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="w-4 h-4" />
              <span>You can always add more assets later</span>
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandKitSetupWizard;
