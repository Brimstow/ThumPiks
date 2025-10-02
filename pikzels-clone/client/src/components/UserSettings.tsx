import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface UserSettings {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
  thumbnailDefaults?: {
    width?: number;
    height?: number;
    style?: string;
  };
  privacy?: {
    profileVisible?: boolean;
    thumbnailsPublic?: boolean;
  };
}

const UserSettings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { theme: currentTheme, toggleTheme } = useTheme();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/user/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data.settings || {});
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();
      setSettings(data.settings);
      setSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSettings(prev => ({
      ...prev,
      theme,
    }));

    // If the theme is changing to match the current theme, toggle it
    if (theme !== currentTheme) {
      toggleTheme();
    }
  };

  const handleLanguageChange = (language: string) => {
    setSettings(prev => ({
      ...prev,
      language,
    }));
  };

  const handleNotificationChange = (
    type: keyof NonNullable<UserSettings['notifications']>,
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: value,
      },
    }));
  };

  const handleThumbnailDefaultsChange = (
    field: keyof NonNullable<UserSettings['thumbnailDefaults']>,
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      thumbnailDefaults: {
        ...prev.thumbnailDefaults,
        [field]: value,
      },
    }));
  };

  const handlePrivacyChange = (
    field: keyof NonNullable<UserSettings['privacy']>,
    value: boolean
  ) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"
        ></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            User Settings
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your account preferences and default settings
          </p>
        </div>

        <div className="px-4 py-5 sm:px-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-200 px-4 py-3 rounded relative">
              Settings saved successfully!
            </div>
          )}

          <div className="space-y-8">
            {/* Theme Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Appearance
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Theme
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                        checked={settings.theme === 'light' || !settings.theme}
                        onChange={() => handleThemeChange('light')}
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Light
                      </span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                        checked={settings.theme === 'dark'}
                        onChange={() => handleThemeChange('dark')}
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Dark
                      </span>
                    </label>
                  </div>
                </div>

                {/* Theme Preview */}
                <div className="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Current theme:{' '}
                      {currentTheme === 'dark' ? 'Dark' : 'Light'}
                    </span>
                    <button
                      onClick={toggleTheme}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Toggle Theme
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Language Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Language
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={settings.language || 'en'}
                    onChange={e => handleLanguageChange(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Notifications
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive email updates about your account
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${
                        settings.notifications?.email
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-600'
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      onClick={() =>
                        handleNotificationChange(
                          'email',
                          !settings.notifications?.email
                        )
                      }
                    >
                      <span
                        className={`${
                          settings.notifications?.email
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      >
                        <span
                          className={`${
                            settings.notifications?.email
                              ? 'opacity-0 ease-out duration-100'
                              : 'opacity-100 ease-in duration-200'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span
                          className={`${
                            settings.notifications?.email
                              ? 'opacity-100 ease-in duration-200'
                              : 'opacity-0 ease-out duration-100'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-indigo-600"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-5.707a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Push Notifications
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive push notifications on your devices
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${
                        settings.notifications?.push
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-600'
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      onClick={() =>
                        handleNotificationChange(
                          'push',
                          !settings.notifications?.push
                        )
                      }
                    >
                      <span
                        className={`${
                          settings.notifications?.push
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      >
                        <span
                          className={`${
                            settings.notifications?.push
                              ? 'opacity-0 ease-out duration-100'
                              : 'opacity-100 ease-in duration-200'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span
                          className={`${
                            settings.notifications?.push
                              ? 'opacity-100 ease-in duration-200'
                              : 'opacity-0 ease-out duration-100'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-indigo-600"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-5.707a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Defaults */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Thumbnail Defaults
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Width
                    </label>
                    <input
                      type="number"
                      value={settings.thumbnailDefaults?.width || 1280}
                      onChange={e =>
                        handleThumbnailDefaultsChange(
                          'width',
                          parseInt(e.target.value) || 1280
                        )
                      }
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Height
                    </label>
                    <input
                      type="number"
                      value={settings.thumbnailDefaults?.height || 720}
                      onChange={e =>
                        handleThumbnailDefaultsChange(
                          'height',
                          parseInt(e.target.value) || 720
                        )
                      }
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Style
                  </label>
                  <select
                    value={settings.thumbnailDefaults?.style || 'bold'}
                    onChange={e =>
                      handleThumbnailDefaultsChange('style', e.target.value)
                    }
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="bold">Bold</option>
                    <option value="minimalist">Minimalist</option>
                    <option value="dramatic">Dramatic</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Privacy
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Profile Visibility
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Make your profile visible to other users
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${
                        settings.privacy?.profileVisible
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-600'
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      onClick={() =>
                        handlePrivacyChange(
                          'profileVisible',
                          !settings.privacy?.profileVisible
                        )
                      }
                    >
                      <span
                        className={`${
                          settings.privacy?.profileVisible
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      >
                        <span
                          className={`${
                            settings.privacy?.profileVisible
                              ? 'opacity-0 ease-out duration-100'
                              : 'opacity-100 ease-in duration-200'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span
                          className={`${
                            settings.privacy?.profileVisible
                              ? 'opacity-100 ease-in duration-200'
                              : 'opacity-0 ease-out duration-100'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-indigo-600"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-5.707a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Thumbnails Public by Default
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Make new thumbnails public by default
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={`${
                        settings.privacy?.thumbnailsPublic
                          ? 'bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-600'
                      } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      onClick={() =>
                        handlePrivacyChange(
                          'thumbnailsPublic',
                          !settings.privacy?.thumbnailsPublic
                        )
                      }
                    >
                      <span
                        className={`${
                          settings.privacy?.thumbnailsPublic
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                      >
                        <span
                          className={`${
                            settings.privacy?.thumbnailsPublic
                              ? 'opacity-0 ease-out duration-100'
                              : 'opacity-100 ease-in duration-200'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-gray-400"
                            fill="none"
                            viewBox="0 0 12 12"
                          >
                            <path
                              d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <span
                          className={`${
                            settings.privacy?.thumbnailsPublic
                              ? 'opacity-100 ease-in duration-200'
                              : 'opacity-0 ease-out duration-100'
                          } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                          aria-hidden="true"
                        >
                          <svg
                            className="h-3 w-3 text-indigo-600"
                            fill="currentColor"
                            viewBox="0 0 12 12"
                          >
                            <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-5.707a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                          </svg>
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
