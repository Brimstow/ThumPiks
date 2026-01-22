import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Eraser, 
  Users, 
  Zap, 
  Image as ImageIcon,
  ArrowRight,
  Info
} from 'lucide-react';

const AIToolsPage: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const aiTools = [
    {
      id: 'generate',
      name: 'AI Image Generation',
      description: 'Create stunning images from text descriptions using advanced AI models',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      features: ['Text-to-image', 'Style presets', 'High resolution', 'Multiple variants']
    },
    {
      id: 'inpaint',
      name: 'AI Inpainting',
      description: 'Intelligently edit parts of your images by describing what you want',
      icon: Wand2,
      color: 'from-blue-500 to-cyan-500',
      features: ['Smart editing', 'Context-aware', 'Natural blending', 'Precise control']
    },
    {
      id: 'remove-bg',
      name: 'Background Removal',
      description: 'Automatically remove backgrounds from images with AI precision',
      icon: Eraser,
      color: 'from-green-500 to-emerald-500',
      features: ['One-click removal', 'Edge detection', 'Transparent output', 'Batch processing']
    },
    {
      id: 'face-swap',
      name: 'Face Swap',
      description: 'Seamlessly swap faces in images using AI face detection',
      icon: Users,
      color: 'from-orange-500 to-red-500',
      features: ['Face detection', 'Natural blending', 'Multiple faces', 'Quick swap']
    },
    {
      id: 'enhance',
      name: 'Image Enhancement',
      description: 'Improve image quality with AI-powered enhancement tools',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      features: ['Auto enhance', 'Sharpen', 'Denoise', 'Color correction']
    },
    {
      id: 'upscale',
      name: 'AI Upscaling',
      description: 'Increase image resolution while maintaining quality using AI',
      icon: ImageIcon,
      color: 'from-indigo-500 to-purple-500',
      features: ['2x/4x upscale', 'Detail preservation', 'Smart interpolation', 'Batch support']
    }
  ];

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Tools
        </h1>
        <p className="text-slate-400 text-lg">
          Powerful AI-driven tools to enhance and transform your thumbnails
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => setSelectedTool(tool.id)}
            >
              {/* Gradient background effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Icon */}
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} p-3 mb-4 shadow-lg shadow-black/20`}>
                <Icon className="w-full h-full text-white" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-2 text-slate-100 group-hover:text-white transition-colors">
                {tool.name}
              </h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {tool.description}
              </p>

              {/* Features */}
              <div className="space-y-2 mb-4">
                {tool.features.slice(0, 3).map((feature, idx) => (
                  <div key={idx} className="flex items-center text-xs text-slate-500">
                    <div className={`w-1 h-1 rounded-full bg-gradient-to-r ${tool.color} mr-2`} />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Action button */}
              <button className="flex items-center justify-between w-full text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                <span>Try it now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-3 text-slate-100">
              How to use AI Tools
            </h3>
            <div className="space-y-4 text-slate-400">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-sm font-semibold flex-shrink-0">
                  1
                </span>
                <p>
                  <strong className="text-slate-300">Open the Editor:</strong> Navigate to the thumbnail editor to access all AI tools
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-sm font-semibold flex-shrink-0">
                  2
                </span>
                <p>
                  <strong className="text-slate-300">Select Your Tool:</strong> Choose from the AI tools panel in the editor
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-400 text-sm font-semibold flex-shrink-0">
                  3
                </span>
                <p>
                  <strong className="text-slate-300">Apply & Customize:</strong> Use the tools on your images and fine-tune the results
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-8 text-center">
        <button 
          onClick={() => window.location.href = '/dashboard/editor'}
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl font-semibold text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg shadow-blue-500/25"
        >
          <Sparkles className="w-5 h-5" />
          Open Editor
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-slate-500 text-sm mt-4">
          Start creating amazing thumbnails with AI-powered tools
        </p>
      </div>
    </div>
  );
};

export default AIToolsPage;
