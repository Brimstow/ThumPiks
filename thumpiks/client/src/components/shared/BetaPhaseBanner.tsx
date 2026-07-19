import React, { useMemo } from 'react';
import { Clock, Users, Flame } from 'lucide-react';
import type { BetaPhaseInfo } from '../../hooks/usePricingData';

interface BetaPhaseBannerProps {
  phase: BetaPhaseInfo;
  spotsLeft: number | null;
  spotsTotal: number | null;
  endsAt: string | null;
}

function formatTimeLeft(endsAt: string): string {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m left`;
}

const BetaPhaseBanner: React.FC<BetaPhaseBannerProps> = ({
  phase,
  spotsLeft,
  spotsTotal,
  endsAt,
}) => {
  const timeLeft = useMemo(() => (endsAt ? formatTimeLeft(endsAt) : null), [endsAt]);

  // Don't render for production phase (no discount)
  if (phase.id === 'production' || phase.discountPercentMonthly <= 0) return null;

  const spotsPercent =
    spotsLeft !== null && spotsTotal !== null && spotsTotal > 0
      ? Math.round((spotsLeft / spotsTotal) * 100)
      : null;

  const isUrgent = (spotsLeft !== null && spotsLeft <= 10) || (spotsPercent !== null && spotsPercent <= 20);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-6 mb-8 ${
        isUrgent
          ? 'border-red-500/50 bg-red-950/30'
          : 'border-blue-500/50 bg-blue-950/20'
      }`}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 opacity-10 ${
          isUrgent
            ? 'bg-gradient-to-r from-red-600 to-orange-600'
            : 'bg-gradient-to-r from-blue-600 to-purple-600'
        }`}
      />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Phase badge + discount */}
        <div className="flex items-start gap-3 min-w-0">
          <Flame className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isUrgent ? 'text-red-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base sm:text-lg font-semibold text-white">
                {phase.badge || phase.name}
              </span>
              <span
                className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                  isUrgent
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {phase.discountPercentMonthly}% OFF monthly
              </span>
              {phase.discountPercentAnnual > phase.discountPercentMonthly && (
                <span
                  className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    isUrgent
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-green-500/20 text-green-300'
                  }`}
                >
                  {phase.discountPercentAnnual}% OFF annually
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Lock in this price forever — discount stays on your subscription
            </p>
          </div>
        </div>

        {/* Spots + Timer counters */}
        <div className="flex items-center gap-6 text-sm">
          {spotsLeft !== null && spotsTotal !== null && (
            <div className="flex items-center gap-2">
              <Users className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-blue-400'}`} />
              <span className={isUrgent ? 'text-red-300 font-semibold' : 'text-slate-300'}>
                {spotsLeft} / {spotsTotal} spots left
              </span>
            </div>
          )}
          {timeLeft && (
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-400' : 'text-blue-400'}`} />
              <span className={isUrgent ? 'text-red-300 font-semibold' : 'text-slate-300'}>
                {timeLeft}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {spotsPercent !== null && (
        <div className="relative mt-4">
          <div className="h-1.5 w-full rounded-full bg-slate-700/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isUrgent
                  ? 'bg-gradient-to-r from-red-500 to-orange-500'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${100 - spotsPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BetaPhaseBanner;
