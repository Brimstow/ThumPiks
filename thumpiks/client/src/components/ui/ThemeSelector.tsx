import React, { useState } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useTheme, ThemeName } from '../../contexts/ThemeContext';

interface ThemePreviewProps {
  themeName: ThemeName;
  isSelected: boolean;
  onClick: () => void;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ themeName, isSelected, onClick }) => {
  const { themes } = useTheme();
  const theme = themes[themeName];

  return (
    <button
      onClick={onClick}
      className={`relative group p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 ${
        isSelected 
          ? 'border-blue-500 shadow-2xl scale-105' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'
      }`}
      style={{
        background: theme.gradients.card
      }}
    >
      {/* Theme Preview */}
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div 
            className="w-4 h-4 rounded-full"
            style={{ background: theme.gradients.primary }}
          />
          {isSelected && (
            <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-full">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>

        {/* Mini Chart Preview */}
        <div className="flex items-end justify-center space-x-1 h-8">
          {[40, 70, 50, 80, 60].map((height, index) => (
            <div
              key={index}
              className="rounded-t transition-all duration-500"
              style={{
                width: '8px',
                height: `${height}%`,
                background: `linear-gradient(to top, ${theme.colors.primary}, ${theme.colors.accent})`,
                animationDelay: `${index * 100}ms`
              }}
            />
          ))}
        </div>

        {/* Theme Info */}
        <div className="text-center">
          <h3 className="text-sm font-bold" style={{ color: theme.colors.text }}>
            {theme.displayName}
          </h3>
          <p className="text-xs mt-1" style={{ color: theme.colors.textSecondary }}>
            {theme.description}
          </p>
        </div>

        {/* Color Palette */}
        <div className="flex justify-center space-x-1">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          />
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: theme.colors.secondary }}
          />
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: theme.colors.accent }}
          />
        </div>
      </div>

      {/* Hover Effects */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div 
          className="absolute inset-0 rounded-2xl opacity-20"
          style={{ 
            background: theme.gradients.primary,
            filter: 'blur(8px)'
          }}
        />
      </div>

      {/* Selection Glow */}
      {isSelected && (
        <div 
          className="absolute inset-0 rounded-2xl opacity-30 animate-pulse"
          style={{ 
            background: theme.gradients.primary,
            filter: 'blur(12px)',
            zIndex: -1
          }}
        />
      )}
    </button>
  );
};

interface ThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ isOpen, onClose }) => {
  const { currentTheme, themeName, setTheme, themes } = useTheme();
  const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);

  const handleThemeSelect = (newTheme: ThemeName) => {
    setTheme(newTheme);
    setPreviewTheme(null);
    
    // Add a little celebration animation
    const celebration = document.createElement('div');
    celebration.innerHTML = '✨';
    celebration.style.position = 'fixed';
    celebration.style.top = '50%';
    celebration.style.left = '50%';
    celebration.style.transform = 'translate(-50%, -50%)';
    celebration.style.fontSize = '2rem';
    celebration.style.zIndex = '9999';
    celebration.style.animation = 'bounce-in 0.6s ease-out forwards';
    document.body.appendChild(celebration);
    
    setTimeout(() => {
      document.body.removeChild(celebration);
    }, 600);

    setTimeout(onClose, 300);
  };

  const handlePreview = (theme: ThemeName) => {
    setPreviewTheme(theme);
    // You could implement a temporary theme preview here
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-gray-200 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Theme</h2>
                <p className="text-sm text-gray-500">Transform your dashboard with beautiful themes</p>
              </div>
            </div>
            
            {/* Current Theme Badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">
                Current: {currentTheme.displayName}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.keys(themes).map((themeKey) => (
              <div
                key={themeKey}
                onMouseEnter={() => handlePreview(themeKey as ThemeName)}
                onMouseLeave={() => setPreviewTheme(null)}
              >
                <ThemePreview
                  themeName={themeKey as ThemeName}
                  isSelected={themeName === themeKey}
                  onClick={() => handleThemeSelect(themeKey as ThemeName)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 p-6 rounded-b-3xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <span className="font-medium">{Object.keys(themes).length}</span> beautiful themes available
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-200 transform hover:scale-105"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Theme Toggle Button Component
export const ThemeToggleButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { currentTheme } = useTheme();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-3 rounded-xl transition-all duration-200 hover:scale-110 group"
        style={{
          background: currentTheme.gradients.card,
          boxShadow: currentTheme.effects.shadow
        }}
        title="Change Theme"
      >
        <Palette className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
      </button>

      <ThemeSelector
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default ThemeSelector;