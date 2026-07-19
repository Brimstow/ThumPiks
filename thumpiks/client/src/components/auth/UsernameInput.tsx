import React, { useState, useEffect, useCallback } from 'react';
import { Check, X, Loader2, RefreshCw } from 'lucide-react';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  fullName: string;
  email: string;
  error?: string;
  className?: string;
}

interface UsernameSuggestion {
  username: string;
  available: boolean;
}

const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  fullName,
  email,
  error,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce timer for availability check
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch username suggestions when name or email changes
  useEffect(() => {
    if (fullName && email && !value) {
      fetchSuggestions();
    }
  }, [fullName, email]);

  // Check availability when username changes
  useEffect(() => {
    if (value.length >= 3) {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new timer for debounced check
      const timer = setTimeout(() => {
        checkAvailability(value);
      }, 500);

      setDebounceTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      setIsAvailable(null);
      setAvailabilityError('');
    }
  }, [value]);

  const fetchSuggestions = async () => {
    if (!fullName || !email) return;

    setLoadingSuggestions(true);
    try {
      const response = await fetch('/api/auth/suggest-usernames', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fullName, email }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Failed to fetch username suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const checkAvailability = async (username: string) => {
    if (username.length < 3) {
      setIsAvailable(null);
      setAvailabilityError('Username must be at least 3 characters');
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityError('');

    try {
      const response = await fetch(`/api/auth/check-username/${encodeURIComponent(username)}`);
      const data = await response.json();

      if (response.ok) {
        setIsAvailable(data.available);
        if (!data.available) {
          setAvailabilityError(data.error || 'Username is already taken');
        }
      } else {
        setAvailabilityError(data.error || 'Failed to check availability');
        setIsAvailable(false);
      }
    } catch (err) {
      console.error('Failed to check username availability:', err);
      setAvailabilityError('Failed to check availability');
      setIsAvailable(false);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
  };

  const handleRefreshSuggestions = () => {
    fetchSuggestions();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '') // Only allow valid characters
      .substring(0, 30); // Max 30 characters
    onChange(newValue);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && !value) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Username input */}
      <div className="relative">
        <input
          type="text"
          name="username"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="johnsmith23"
          className={`w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-2 transition-colors ${
            error || availabilityError
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-600'
              : isAvailable
              ? 'border-green-500 focus:border-green-500 focus:ring-green-500 dark:border-green-600'
              : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600'
          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500`}
        />

        {/* Status icon */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {checkingAvailability ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : isAvailable === true ? (
            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : isAvailable === false ? (
            <X className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : null}
        </div>
      </div>

      {/* Availability message */}
      {value.length >= 3 && !checkingAvailability && (
        <div className="flex items-center gap-1">
          {isAvailable ? (
            <p className="text-xs text-green-600 dark:text-green-400">
              ✓ Username is available
            </p>
          ) : availabilityError ? (
            <p className="text-xs text-red-600 dark:text-red-400">
              {availabilityError}
            </p>
          ) : null}
        </div>
      )}

      {/* Error message */}
      {error && !availabilityError && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Username format hint */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        3-30 characters. Letters, numbers, dots, underscores, and dashes only.
      </p>

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Suggested usernames:
            </span>
            <button
              type="button"
              onClick={handleRefreshSuggestions}
              disabled={loadingSuggestions}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <RefreshCw
                className={`w-3 h-3 ${loadingSuggestions ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors border border-transparent hover:border-indigo-500 dark:hover:border-indigo-400"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  @{suggestion}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowSuggestions(false)}
            className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 py-1"
          >
            I'll create my own
          </button>
        </div>
      )}

      {/* Show suggestions button if hidden */}
      {!showSuggestions && suggestions.length > 0 && !value && (
        <button
          type="button"
          onClick={() => setShowSuggestions(true)}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
        >
          Show username suggestions
        </button>
      )}
    </div>
  );
};

export default UsernameInput;
