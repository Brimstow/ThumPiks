import React, { useState } from 'react';
import { Mail, X, AlertCircle, Loader2 } from 'lucide-react';

interface VerificationBannerProps {
  email: string;
  onResend?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const VerificationBanner: React.FC<VerificationBannerProps> = ({
  email,
  onResend,
  onDismiss,
  className = '',
}) => {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendSuccess(true);
        if (onResend) onResend();

        // Hide success message after 5 seconds
        setTimeout(() => {
          setResendSuccess(false);
        }, 5000);
      } else {
        setResendError(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setResendError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (isDismissed) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Main Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
              Email Verification Required
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
              Please verify your email address to unlock all features. We've sent a verification
              link to <span className="font-medium">{email}</span>
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleResend}
                disabled={isResending || resendSuccess}
                className="inline-flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  <>
                    <Mail className="w-4 h-4" />
                    Email Sent!
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Resend Verification Email
                  </>
                )}
              </button>

              <span className="text-xs text-yellow-600 dark:text-yellow-500">
                Check your spam folder if you don't see it
              </span>
            </div>

            {/* Error Message */}
            {resendError && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                {resendError}
              </div>
            )}

            {/* Success Message */}
            {resendSuccess && (
              <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ Verification email sent successfully!
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Feature Restrictions Notice */}
      <div className="bg-yellow-100 dark:bg-yellow-900/10 border-t border-yellow-200 dark:border-yellow-800 px-4 py-2">
        <p className="text-xs text-yellow-700 dark:text-yellow-500">
          <span className="font-medium">Limited Access:</span> You can explore the dashboard, but
          creating or saving thumbnails requires email verification.
        </p>
      </div>
    </div>
  );
};

export default VerificationBanner;
