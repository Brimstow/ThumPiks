import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrength {
  score: number; // 0-5
  label: 'Very Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  feedback: string[];
  meetsRequirements: boolean;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRequirements = true,
  className = '',
}) => {
  // Calculate password strength
  const calculateStrength = (pwd: string): PasswordStrength => {
    if (!pwd) {
      return {
        score: 0,
        label: 'Very Weak',
        feedback: [],
        meetsRequirements: false,
      };
    }

    let score = 0;
    const feedback: string[] = [];

    // Length scoring
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;

    // Character variety scoring
    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(pwd);

    let varietyCount = 0;
    if (hasLower) varietyCount++;
    if (hasUpper) varietyCount++;
    if (hasNumber) varietyCount++;
    if (hasSpecial) varietyCount++;

    score += Math.min(varietyCount - 1, 2);

    // Common passwords check
    const commonPasswords = [
      'password',
      'password123',
      '123456',
      '12345678',
      'qwerty',
      'abc123',
    ];
    const isCommon = commonPasswords.includes(pwd.toLowerCase());

    // Sequential characters check
    const hasSequential = /(abc|bcd|cde|123|234|345|456|567|678|789)/i.test(pwd);

    // Repeated characters check
    const hasRepeated = /(.)\1{2,}/.test(pwd);

    // Deductions
    if (isCommon) {
      score = Math.max(0, score - 2);
      feedback.push('Avoid common passwords');
    }
    if (hasSequential) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid sequential characters');
    }
    if (hasRepeated) {
      score = Math.max(0, score - 1);
      feedback.push('Avoid repeated characters');
    }

    // Positive feedback
    if (pwd.length >= 12) feedback.push('Good length');
    if (varietyCount >= 4) feedback.push('Great character variety');

    // Missing requirements feedback
    if (!hasUpper) feedback.push('Add uppercase letters');
    if (!hasLower) feedback.push('Add lowercase letters');
    if (!hasNumber) feedback.push('Add numbers');
    if (!hasSpecial) feedback.push('Add special characters');

    // Determine label
    let label: PasswordStrength['label'];
    if (score <= 1) label = 'Very Weak';
    else if (score === 2) label = 'Weak';
    else if (score === 3) label = 'Medium';
    else if (score === 4) label = 'Strong';
    else label = 'Very Strong';

    // Check if meets all requirements
    const meetsRequirements =
      pwd.length >= 8 &&
      pwd.length <= 128 &&
      hasLower &&
      hasUpper &&
      hasNumber &&
      hasSpecial &&
      !isCommon;

    return {
      score,
      label,
      feedback,
      meetsRequirements,
    };
  };

  // Get requirements status
  const getRequirements = (pwd: string): PasswordRequirement[] => {
    return [
      {
        label: 'At least 8 characters',
        met: pwd.length >= 8,
      },
      {
        label: 'One uppercase letter (A-Z)',
        met: /[A-Z]/.test(pwd),
      },
      {
        label: 'One lowercase letter (a-z)',
        met: /[a-z]/.test(pwd),
      },
      {
        label: 'One number (0-9)',
        met: /[0-9]/.test(pwd),
      },
      {
        label: 'One special character (!@#$%^&*)',
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(pwd),
      },
    ];
  };

  const strength = calculateStrength(password);
  const requirements = getRequirements(password);

  // Color classes based on strength
  const getStrengthColor = (): string => {
    switch (strength.label) {
      case 'Very Weak':
        return 'text-red-600 dark:text-red-400';
      case 'Weak':
        return 'text-orange-600 dark:text-orange-400';
      case 'Medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'Strong':
        return 'text-green-600 dark:text-green-400';
      case 'Very Strong':
        return 'text-emerald-600 dark:text-emerald-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBarColor = (): string => {
    switch (strength.label) {
      case 'Very Weak':
        return 'bg-red-600';
      case 'Weak':
        return 'bg-orange-600';
      case 'Medium':
        return 'bg-yellow-600';
      case 'Strong':
        return 'bg-green-600';
      case 'Very Strong':
        return 'bg-emerald-600';
      default:
        return 'bg-gray-600';
    }
  };

  const percentage = (strength.score / 5) * 100;

  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Password Strength
          </span>
          <span className={`text-xs font-semibold ${getStrengthColor()}`}>
            {strength.label}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1.5">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="mt-0.5">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <X className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                )}
              </div>
              <span
                className={`text-xs ${
                  req.met
                    ? 'text-green-600 dark:text-green-400 line-through'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Feedback messages */}
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.slice(0, 3).map((message, index) => (
            <p
              key={index}
              className="text-xs text-gray-500 dark:text-gray-400 italic"
            >
              💡 {message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
