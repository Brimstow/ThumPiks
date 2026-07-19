import type { GlobalChatScope, SuggestedPrompt } from '../types';

interface ScopeSelectorProps {
  onSelectScope: (scope: GlobalChatScope) => void;
}

const SCOPE_CARDS: Array<{
  scope: GlobalChatScope;
  title: string;
  description: string;
  icon: string;
  prompts: SuggestedPrompt[];
}> = [
  {
    scope: 'product',
    title: 'Product Help',
    description: 'Learn how to use ThumPiks features',
    icon: '💡',
    prompts: [
      { label: 'How do I add text?', prompt: 'How do I add text to my thumbnail?' },
      { label: 'AI tools guide', prompt: 'What AI tools are available?' },
    ],
  },
  {
    scope: 'billing',
    title: 'Billing & Plans',
    description: 'Credits, subscriptions, payments',
    icon: '💳',
    prompts: [
      { label: 'Plan comparison', prompt: 'What plans do you offer?' },
      { label: 'Credit usage', prompt: 'How are credits used?' },
    ],
  },
  {
    scope: 'feedback',
    title: 'Send Feedback',
    description: 'Report bugs or request features',
    icon: '💬',
    prompts: [
      { label: 'Report a bug', prompt: 'I want to report a bug' },
      { label: 'Feature request', prompt: 'I have a feature suggestion' },
    ],
  },
];

export function ScopeSelector({ onSelectScope }: ScopeSelectorProps) {
  return (
    <div className="gchat-scope-selector">
      <p className="gchat-scope-title">How can I help you?</p>
      <div className="gchat-scope-cards">
        {SCOPE_CARDS.map((card) => (
          <button
            key={card.scope}
            className="gchat-scope-card"
            onClick={() => onSelectScope(card.scope)}
          >
            <span className="gchat-scope-icon">{card.icon}</span>
            <span className="gchat-scope-card-title">{card.title}</span>
            <span className="gchat-scope-card-desc">{card.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
