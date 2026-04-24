import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CommandPalette.css';

interface CommandAction {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  category: 'navigation' | 'create' | 'settings' | 'other';
  keywords?: string[];
}

interface CommandPaletteProps {
  onThemeToggle?: () => void;
  onLogout?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  onThemeToggle, 
  onLogout 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      description: 'Navigate to dashboard home',
      action: () => navigate('/dashboard'),
      category: 'navigation',
      keywords: ['home', 'main']
    },
    {
      id: 'nav-thumbnails',
      label: 'Go to Thumbnails',
      description: 'View all your thumbnails',
      action: () => navigate('/thumbnails'),
      category: 'navigation',
      keywords: ['images', 'media']
    },
    {
      id: 'nav-projects',
      label: 'Go to Projects',
      description: 'View all your projects',
      action: () => navigate('/projects'),
      category: 'navigation',
      keywords: ['folders', 'organize']
    },
    {
      id: 'nav-templates',
      label: 'Go to Templates',
      description: 'Browse template marketplace',
      action: () => navigate('/templates'),
      category: 'navigation',
      keywords: ['browse', 'marketplace']
    },
    {
      id: 'nav-analytics',
      label: 'Go to Analytics',
      description: 'View your analytics dashboard',
      action: () => navigate('/analytics'),
      category: 'navigation',
      keywords: ['stats', 'metrics', 'data']
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      description: 'Manage your account settings',
      action: () => navigate('/settings'),
      category: 'navigation',
      keywords: ['preferences', 'account', 'profile']
    },
    // Create actions
    {
      id: 'create-thumbnail',
      label: 'Create New Thumbnail',
      description: 'Generate AI-powered thumbnails',
      action: () => navigate('/thumbnails/create'),
      category: 'create',
      keywords: ['new', 'generate', 'make']
    },
    {
      id: 'create-project',
      label: 'Create New Project',
      description: 'Start a new project',
      action: () => navigate('/projects/new'),
      category: 'create',
      keywords: ['new', 'folder']
    },
    {
      id: 'batch-edit',
      label: 'Batch Edit Thumbnails',
      description: 'Edit multiple thumbnails at once',
      action: () => navigate('/thumbnails/batch-edit'),
      category: 'create',
      keywords: ['bulk', 'multiple', 'mass']
    },
    // Settings
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      action: () => onThemeToggle?.(),
      category: 'settings',
      keywords: ['dark', 'light', 'mode', 'appearance']
    },
    {
      id: 'logout',
      label: 'Logout',
      description: 'Sign out of your account',
      action: () => onLogout?.(),
      category: 'settings',
      keywords: ['sign out', 'exit']
    }
  ];

  const filteredCommands = search.trim()
    ? commands.filter(cmd => {
        const searchLower = search.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.description?.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some(kw => kw.toLowerCase().includes(searchLower))
        );
      })
    : commands;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+K or Cmd+K to toggle
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setIsOpen(prev => !prev);
      setSearch('');
      setSelectedIndex(0);
    }

    // Escape to close
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      executeCommand(filteredCommands[selectedIndex]);
    }
  };

  const executeCommand = (command: CommandAction) => {
    command.action();
    setIsOpen(false);
    setSearch('');
    setSelectedIndex(0);
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
      <div className="command-palette" onClick={e => e.stopPropagation()}>
        <div className="command-palette__header">
          <input
            type="text"
            className="command-palette__input"
            placeholder="Type a command or search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleInputKeyDown}
            autoFocus
          />
          <kbd className="command-palette__shortcut">ESC</kbd>
        </div>

        <div className="command-palette__results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette__empty">
              No commands found for "{search}"
            </div>
          ) : (
            <>
              {['navigation', 'create', 'settings'].map(category => {
                const categoryCommands = filteredCommands.filter(
                  cmd => cmd.category === category
                );
                
                if (categoryCommands.length === 0) return null;

                return (
                  <div key={category} className="command-palette__section">
                    <div className="command-palette__category">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    {categoryCommands.map((cmd, idx) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          className={`command-palette__item ${
                            selectedIndex === globalIndex ? 'command-palette__item--selected' : ''
                          }`}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                        >
                          <div className="command-palette__item-content">
                            <div className="command-palette__item-label">
                              {cmd.label}
                            </div>
                            {cmd.description && (
                              <div className="command-palette__item-description">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="command-palette__footer">
          <div className="command-palette__hint">
            <kbd>↑↓</kbd> Navigate
            <kbd>↵</kbd> Select
            <kbd>ESC</kbd> Close
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
