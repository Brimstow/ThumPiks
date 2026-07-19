import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AICommandBar.css';

// ============================================================================
// AI Command Bar
// Floating prompt input for natural language editor commands
// Activated via Ctrl+K or clicking the sparkle button
// ============================================================================

/** A single action parsed from the user's prompt */
interface ParsedAction {
  action: string;
  target: string;
  description: string;
  params: Record<string, unknown>;
}

/** Result from the LLM command parser */
interface CommandResult {
  success: boolean;
  actions: ParsedAction[];
  summary: string;
  needsAutoTarget: boolean;
  autoTargetQuery?: string;
}

interface AICommandBarProps {
  /** Whether the command bar is visible */
  isOpen: boolean;
  /** Toggle visibility */
  onToggle: () => void;
  /** Parse a prompt into structured actions */
  onParseCommand: (prompt: string) => Promise<CommandResult>;
  /** Execute all actions from a result */
  onExecuteAll: (result: CommandResult) => Promise<{ executed: number; errors: string[] }>;
  /** Whether an AI operation is currently loading */
  isLoading?: boolean;
  /** Custom suggested prompts (overrides defaults) */
  suggestedPrompts?: string[];
}

const SUGGESTED_PROMPTS = [
  'Add bold white text saying "EPIC"',
  'Remove the background',
  'Make it more dramatic',
  'Enhance image quality',
  'Move text to the top center',
  'Make the text bigger and red',
  'Generate a sunset background',
  'Upscale to 4x resolution',
  'Decompose into layers',
];

const AICommandBar: React.FC<AICommandBarProps> = ({
  isOpen,
  onToggle,
  onParseCommand,
  onExecuteAll,
  isLoading = false,
  suggestedPrompts,
}) => {
  const prompts = suggestedPrompts || SUGGESTED_PROMPTS;
  const [prompt, setPrompt] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [pendingResult, setPendingResult] = useState<CommandResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setShowSuggestions(true);
    }
    if (!isOpen) {
      setPrompt('');
      setPendingResult(null);
      setFeedback(null);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  // Ctrl+K global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onToggle();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isParsing || isExecuting) return;

    setIsParsing(true);
    setFeedback(null);
    setPendingResult(null);
    setShowSuggestions(false);

    try {
      const result = await onParseCommand(prompt.trim());
      setPendingResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse command';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsParsing(false);
    }
  }, [prompt, isParsing, isExecuting, onParseCommand]);

  const handleConfirm = useCallback(async () => {
    if (!pendingResult || isExecuting) return;

    setIsExecuting(true);
    try {
      const { executed, errors } = await onExecuteAll(pendingResult);

      if (errors.length > 0) {
        setFeedback({
          type: 'error',
          message: `${executed} done, ${errors.length} failed: ${errors[0]}`,
        });
      } else {
        setFeedback({
          type: 'success',
          message: `Done! ${pendingResult.summary}`,
        });
        setPrompt('');
        setPendingResult(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Execution failed';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsExecuting(false);
    }
  }, [pendingResult, isExecuting, onExecuteAll]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setPrompt(suggestion);
    setShowSuggestions(false);
    // Auto-submit after setting
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (pendingResult) {
          handleConfirm();
        } else {
          handleSubmit();
        }
      }
    },
    [handleSubmit, handleConfirm, pendingResult]
  );

  if (!isOpen) return null;

  const isBusy = isParsing || isExecuting || isLoading;

  return (
    <>
      {/* Backdrop */}
      <div className="ai-command-backdrop" onClick={onToggle} />

      {/* Command bar container */}
      <div className="ai-command-bar">
        {/* Input row */}
        <div className="ai-command-input-row">
          <div className="ai-command-icon">
            {isBusy ? (
              <svg className="ai-command-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            className="ai-command-input"
            placeholder="Quick command: add text, remove bg, expand... (Ctrl+K)"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setPendingResult(null);
              setShowSuggestions(e.target.value.length === 0);
            }}
            onKeyDown={handleKeyDown}
            disabled={isBusy}
            aria-label="AI command prompt"
          />

          <div className="ai-command-shortcuts">
            {pendingResult ? (
              <button
                className="ai-command-confirm-btn"
                onClick={handleConfirm}
                disabled={isBusy}
              >
                {isExecuting ? 'Running...' : 'Confirm'}
              </button>
            ) : (
              <button
                className="ai-command-submit-btn"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isBusy}
              >
                {isParsing ? '...' : '⏎'}
              </button>
            )}
            <span className="ai-command-hint">
              {pendingResult ? 'Enter to confirm · Esc to cancel' : 'Ctrl+K'}
            </span>
          </div>
        </div>

        {/* Pending result preview */}
        {pendingResult && (
          <div className="ai-command-preview">
            <div className="ai-command-preview-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span>{pendingResult.summary}</span>
            </div>
            <div className="ai-command-actions-list">
              {pendingResult.actions.map((action, i) => (
                <div key={i} className="ai-command-action-item">
                  <span className="ai-command-action-badge">{action.action}</span>
                  <span className="ai-command-action-desc">{action.description}</span>
                </div>
              ))}
            </div>
            {pendingResult.needsAutoTarget && pendingResult.autoTargetQuery && (
              <div className="ai-command-auto-target-notice">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                AI will auto-select: "{pendingResult.autoTargetQuery}"
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && !pendingResult && !prompt && (
          <div className="ai-command-suggestions">
            <span className="ai-command-suggestions-label">Try saying:</span>
            <div className="ai-command-suggestions-grid">
              {prompts.map((s, i) => (
                <button
                  key={i}
                  className="ai-command-suggestion-chip"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div className={`ai-command-feedback ai-command-feedback-${feedback.type}`}>
            {feedback.type === 'success' ? '✓' : '✗'} {feedback.message}
          </div>
        )}
      </div>
    </>
  );
};

export default AICommandBar;
