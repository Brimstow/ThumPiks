import React, { useState, useEffect } from 'react';
import { adminSettingsService } from '../../services/admin';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Mail, 
  Database,
  Globe,
  Lock,
  Bell,
  Palette,
  Server,
  Key,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Sliders,
  Code
} from 'lucide-react';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  settings: Setting[];
}

interface Setting {
  id: string;
  label: string;
  description: string;
  type: 'text' | 'email' | 'password' | 'number' | 'boolean' | 'select' | 'textarea' | 'color' | 'file';
  value: any;
  options?: { value: string; label: string }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  sensitive?: boolean;
}

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SettingSection[]>([]);
  const [activeSection, setActiveSection] = useState('general');
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Initialize settings with mock data
    const mockSettings: SettingSection[] = [
      {
        id: 'general',
        title: 'General Settings',
        description: 'Basic application configuration and preferences',
        icon: <Settings className="w-5 h-5" />,
        settings: [
          {
            id: 'app_name',
            label: 'Application Name',
            description: 'The name displayed throughout the application',
            type: 'text',
            value: 'Thumbnail Creator Pro',
            validation: { required: true }
          },
          {
            id: 'app_description',
            label: 'Application Description',
            description: 'Brief description shown to users',
            type: 'textarea',
            value: 'Create stunning thumbnails for your content with our professional tools'
          },
          {
            id: 'maintenance_mode',
            label: 'Maintenance Mode',
            description: 'Enable maintenance mode to restrict access',
            type: 'boolean',
            value: false
          },
          {
            id: 'max_file_size',
            label: 'Maximum File Size (MB)',
            description: 'Maximum file size allowed for uploads',
            type: 'number',
            value: 50,
            validation: { min: 1, max: 500 }
          },
          {
            id: 'timezone',
            label: 'Default Timezone',
            description: 'Default timezone for the application',
            type: 'select',
            value: 'UTC',
            options: [
              { value: 'UTC', label: 'UTC' },
              { value: 'America/New_York', label: 'Eastern Time' },
              { value: 'America/Chicago', label: 'Central Time' },
              { value: 'America/Denver', label: 'Mountain Time' },
              { value: 'America/Los_Angeles', label: 'Pacific Time' },
              { value: 'Europe/London', label: 'London' },
              { value: 'Europe/Paris', label: 'Paris' },
              { value: 'Asia/Tokyo', label: 'Tokyo' }
            ]
          }
        ]
      },
      {
        id: 'security',
        title: 'Security Settings',
        description: 'Authentication, authorization, and security policies',
        icon: <Shield className="w-5 h-5" />,
        settings: [
          {
            id: 'password_min_length',
            label: 'Minimum Password Length',
            description: 'Minimum number of characters required for passwords',
            type: 'number',
            value: 8,
            validation: { min: 6, max: 128 }
          },
          {
            id: 'session_timeout',
            label: 'Session Timeout (minutes)',
            description: 'User session timeout in minutes',
            type: 'number',
            value: 60,
            validation: { min: 5, max: 1440 }
          },
          {
            id: 'max_login_attempts',
            label: 'Max Login Attempts',
            description: 'Maximum failed login attempts before account lockout',
            type: 'number',
            value: 5,
            validation: { min: 3, max: 20 }
          },
          {
            id: 'two_factor_required',
            label: 'Require Two-Factor Authentication',
            description: 'Force all users to enable 2FA',
            type: 'boolean',
            value: false
          },
          {
            id: 'jwt_secret',
            label: 'JWT Secret Key',
            description: 'Secret key used for JWT token signing',
            type: 'password',
            value: '*********************',
            sensitive: true,
            validation: { required: true }
          }
        ]
      },
      {
        id: 'email',
        title: 'Email Configuration',
        description: 'SMTP and email service settings',
        icon: <Mail className="w-5 h-5" />,
        settings: [
          {
            id: 'smtp_host',
            label: 'SMTP Host',
            description: 'SMTP server hostname',
            type: 'text',
            value: 'smtp.gmail.com'
          },
          {
            id: 'smtp_port',
            label: 'SMTP Port',
            description: 'SMTP server port number',
            type: 'number',
            value: 587,
            validation: { min: 1, max: 65535 }
          },
          {
            id: 'smtp_username',
            label: 'SMTP Username',
            description: 'Username for SMTP authentication',
            type: 'email',
            value: 'noreply@thumbnailcreator.com'
          },
          {
            id: 'smtp_password',
            label: 'SMTP Password',
            description: 'Password for SMTP authentication',
            type: 'password',
            value: '*********************',
            sensitive: true
          },
          {
            id: 'email_from_name',
            label: 'From Name',
            description: 'Default sender name for outgoing emails',
            type: 'text',
            value: 'Thumbnail Creator Pro'
          },
          {
            id: 'email_notifications',
            label: 'Enable Email Notifications',
            description: 'Allow system to send email notifications',
            type: 'boolean',
            value: true
          }
        ]
      },
      {
        id: 'database',
        title: 'Database Settings',
        description: 'Database connection and performance settings',
        icon: <Database className="w-5 h-5" />,
        settings: [
          {
            id: 'db_connection_pool',
            label: 'Connection Pool Size',
            description: 'Maximum number of database connections',
            type: 'number',
            value: 10,
            validation: { min: 1, max: 100 }
          },
          {
            id: 'db_query_timeout',
            label: 'Query Timeout (seconds)',
            description: 'Maximum time to wait for database queries',
            type: 'number',
            value: 30,
            validation: { min: 5, max: 300 }
          },
          {
            id: 'enable_query_logging',
            label: 'Enable Query Logging',
            description: 'Log all database queries for debugging',
            type: 'boolean',
            value: false
          },
          {
            id: 'backup_frequency',
            label: 'Backup Frequency',
            description: 'How often to create database backups',
            type: 'select',
            value: 'daily',
            options: [
              { value: 'hourly', label: 'Hourly' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' }
            ]
          }
        ]
      },
      {
        id: 'api',
        title: 'API Configuration',
        description: 'API keys, rate limiting, and external service settings',
        icon: <Globe className="w-5 h-5" />,
        settings: [
          {
            id: 'api_rate_limit',
            label: 'API Rate Limit (requests/minute)',
            description: 'Maximum API requests per minute per user',
            type: 'number',
            value: 100,
            validation: { min: 10, max: 10000 }
          },
          {
            id: 'cors_origins',
            label: 'CORS Allowed Origins',
            description: 'Comma-separated list of allowed CORS origins',
            type: 'textarea',
            value: 'https://thumbnailcreator.com,https://app.thumbnailcreator.com'
          },
          {
            id: 'cdn_url',
            label: 'CDN Base URL',
            description: 'Base URL for CDN assets',
            type: 'text',
            value: 'https://cdn.thumbnailcreator.com'
          },
          {
            id: 'storage_provider',
            label: 'Storage Provider',
            description: 'Cloud storage provider for file uploads',
            type: 'select',
            value: 'aws_s3',
            options: [
              { value: 'local', label: 'Local Storage' },
              { value: 'aws_s3', label: 'Amazon S3' },
              { value: 'gcp_storage', label: 'Google Cloud Storage' },
              { value: 'azure_blob', label: 'Azure Blob Storage' }
            ]
          },
          {
            id: 'aws_access_key',
            label: 'AWS Access Key ID',
            description: 'AWS access key for S3 storage',
            type: 'password',
            value: '*********************',
            sensitive: true
          }
        ]
      },
      {
        id: 'ui',
        title: 'UI & Theme Settings',
        description: 'User interface customization and branding',
        icon: <Palette className="w-5 h-5" />,
        settings: [
          {
            id: 'primary_color',
            label: 'Primary Brand Color',
            description: 'Main color used throughout the application',
            type: 'color',
            value: '#3B82F6'
          },
          {
            id: 'secondary_color',
            label: 'Secondary Brand Color',
            description: 'Secondary color for accents and highlights',
            type: 'color',
            value: '#8B5CF6'
          },
          {
            id: 'dark_mode_default',
            label: 'Default to Dark Mode',
            description: 'Use dark mode as the default theme',
            type: 'boolean',
            value: false
          },
          {
            id: 'show_welcome_tour',
            label: 'Show Welcome Tour',
            description: 'Display onboarding tour for new users',
            type: 'boolean',
            value: true
          },
          {
            id: 'custom_css',
            label: 'Custom CSS',
            description: 'Additional CSS to customize the application appearance',
            type: 'textarea',
            value: '/* Custom styles go here */'
          }
        ]
      }
    ];

    // Load values from service and merge into section definitions
    const loadValues = async () => {
      try {
        const result = await adminSettingsService.getSettings();
        if (result.success && result.data) {
          const values = result.data as Record<string, Record<string, any>>;
          const merged = mockSettings.map(section => ({
            ...section,
            settings: section.settings.map(setting => {
              const sectionValues = values[section.id];
              if (sectionValues && setting.id in sectionValues) {
                return { ...setting, value: sectionValues[setting.id] };
              }
              return setting;
            }),
          }));
          setSettings(merged);
        } else {
          setSettings(mockSettings);
        }
      } catch {
        setSettings(mockSettings);
      }
    };
    loadValues();
  }, []);

  const handleSettingChange = (sectionId: string, settingId: string, value: any) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [`${sectionId}.${settingId}`]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await adminSettingsService.saveSettings(unsavedChanges);
      if (!result.success) {
        console.error('Failed to save settings');
        setSaving(false);
        return;
      }

      // Apply changes to settings
      setSettings(prevSettings => {
        return prevSettings.map(section => ({
          ...section,
          settings: section.settings.map(setting => {
            const changeKey = `${section.id}.${setting.id}`;
            if (changeKey in unsavedChanges) {
              return { ...setting, value: unsavedChanges[changeKey] };
            }
            return setting;
          })
        }));
      });

      setUnsavedChanges({});
      
      // Show success message (you can implement a toast system)
      console.log('Settings saved successfully!');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
    setSaving(false);
  };

  const toggleSensitiveVisibility = (settingId: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  const renderSettingInput = (section: SettingSection, setting: Setting) => {
    const changeKey = `${section.id}.${setting.id}`;
    const currentValue = changeKey in unsavedChanges ? unsavedChanges[changeKey] : setting.value;
    const hasUnsavedChange = changeKey in unsavedChanges;

    const commonClasses = `w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-[#2563ff] focus:border-transparent transition-colors text-slate-100 bg-slate-900/80 placeholder-slate-500 ${
      hasUnsavedChange ? 'border-yellow-500/30' : 'border-slate-700'
    }`;

    switch (setting.type) {
      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={currentValue}
              onChange={(e) => handleSettingChange(section.id, setting.id, e.target.checked)}
              className="sr-only"
            />
            <div className={`relative w-12 h-6 rounded-full transition-colors ${
              currentValue ? 'bg-[#2563ff]' : 'bg-slate-600'
            }`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                currentValue ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </div>
            <span className="ml-3 text-sm font-medium text-slate-300">
              {currentValue ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => handleSettingChange(section.id, setting.id, e.target.value)}
            className={commonClasses}
          >
            {setting.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        return (
          <textarea
            value={currentValue}
            onChange={(e) => handleSettingChange(section.id, setting.id, e.target.value)}
            className={`${commonClasses} h-24 resize-none`}
            placeholder={setting.description}
          />
        );

      case 'color':
        return (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={currentValue}
              onChange={(e) => handleSettingChange(section.id, setting.id, e.target.value)}
              className="w-12 h-8 rounded border border-slate-700 cursor-pointer"
            />
            <input
              type="text"
              value={currentValue}
              onChange={(e) => handleSettingChange(section.id, setting.id, e.target.value)}
              className={commonClasses}
              placeholder="#000000"
            />
          </div>
        );

      case 'password':
        return (
          <div className="relative">
            <input
              type={setting.sensitive && !showSensitive[setting.id] ? 'password' : 'text'}
              value={currentValue}
              onChange={(e) => handleSettingChange(section.id, setting.id, e.target.value)}
              className={`${commonClasses} pr-12`}
              placeholder={setting.description}
            />
            {setting.sensitive && (
              <button
                type="button"
                onClick={() => toggleSensitiveVisibility(setting.id)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showSensitive[setting.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        );

      default:
        return (
          <input
            type={setting.type}
            value={currentValue}
            onChange={(e) => handleSettingChange(section.id, setting.id, setting.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            className={commonClasses}
            placeholder={setting.description}
            min={setting.validation?.min}
            max={setting.validation?.max}
            required={setting.validation?.required}
          />
        );
    }
  };

  const filteredSettings = settings.map(section => ({
    ...section,
    settings: section.settings.filter(setting => 
      searchQuery === '' || 
      setting.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.settings.length > 0);

  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-50 mb-2">
              Admin Settings
            </h1>
            <p className="text-slate-400 font-medium">Configure system settings and application preferences</p>
          </div>
          
          <div className="flex items-center gap-4">
            {hasUnsavedChanges && (
              <span className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4" />
                Unsaved changes
              </span>
            )}
            
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || saving}
              className="flex items-center gap-2 px-6 py-2 bg-[#2563ff] text-white rounded-xl font-semibold hover:bg-[#1d4fff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Settings className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 focus:ring-2 focus:ring-[#2563ff] focus:border-transparent bg-slate-900/80 text-slate-100 placeholder-slate-500"
          />
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-80 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-fit sticky top-8">
          <h2 className="text-lg font-bold text-slate-50 mb-4">Setting Categories</h2>
          <nav className="space-y-2">
            {filteredSettings.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 ${
                  activeSection === section.id
                    ? 'bg-[#2563ff] text-white'
                    : 'text-slate-100 hover:bg-[#202020]'
                }`}
              >
                <div className={`transition-colors ${
                  activeSection === section.id ? 'text-white' : 'text-slate-400'
                }`}>
                  {section.icon}
                </div>
                <div>
                  <div className="font-semibold">{section.title}</div>
                  <div className="text-xs text-slate-500">{section.settings.length} settings</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {filteredSettings.map(section => (
            activeSection === section.id && (
              <div key={section.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-[#2563ff]/10 text-[#2563ff]">
                      {section.icon}
                    </div>
                    <h2 className="text-3xl font-bold text-slate-50">{section.title}</h2>
                  </div>
                  <p className="text-slate-400">{section.description}</p>
                </div>

                <div className="space-y-8">
                  {section.settings.map(setting => {
                    const changeKey = `${section.id}.${setting.id}`;
                    const hasUnsavedChange = changeKey in unsavedChanges;
                    
                    return (
                      <div
                        key={setting.id}
                        className={`p-6 rounded-2xl border-2 transition-all duration-200 ${
                          hasUnsavedChange 
                            ? 'border-yellow-500/20 bg-yellow-500/5' 
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-lg font-semibold text-slate-50">
                              {setting.label}
                              {setting.validation?.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            {hasUnsavedChange && (
                              <span className="text-xs text-yellow-400 font-medium bg-yellow-500/10 px-2 py-1 rounded-full">
                                Modified
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400">{setting.description}</p>
                        </div>
                        
                        {renderSettingInput(section, setting)}

                        {setting.validation && (
                          <div className="mt-2 text-xs text-slate-500">
                            {setting.validation.required && <span>Required • </span>}
                            {setting.validation.min !== undefined && <span>Min: {setting.validation.min} • </span>}
                            {setting.validation.max !== undefined && <span>Max: {setting.validation.max} • </span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;