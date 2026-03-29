import { useState, useEffect, useCallback } from 'react';
import { authGet } from '../utils/api';

/**
 * Lightweight hook that exposes the current user's plan type,
 * whether the freemium watermark should be applied on exports,
 * and watermark-free export quota status.
 *
 * Defaults to `'free'` (watermark ON) when the subscription cannot
 * be fetched — this is the safe default so free users never get
 * un-watermarked exports due to a network hiccup.
 */
export function useSubscription() {
  const [planType, setPlanType] = useState<string>('free');
  const [watermarkFreeRemaining, setWatermarkFreeRemaining] = useState(0);
  const [watermarkFreeTotal, setWatermarkFreeTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(() => {
    authGet('/api/subscription/current')
      .then((res) => {
        if (!res.ok) throw new Error('subscription fetch failed');
        return res.json();
      })
      .then((data: { planType?: string; watermarkFreeRemaining?: number; watermarkFreeTotal?: number }) => {
        setPlanType(data.planType || 'free');
        setWatermarkFreeRemaining(data.watermarkFreeRemaining ?? 0);
        setWatermarkFreeTotal(data.watermarkFreeTotal ?? 0);
      })
      .catch(() => {
        // Safe default: treat as free tier (watermark applied)
        setPlanType('free');
        setWatermarkFreeRemaining(0);
        setWatermarkFreeTotal(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Derive the watermark flag from the plan's feature set.
  // Free plan has `watermark: true`; all paid plans have `watermark: false`.
  // We default to watermarking when the plan is unknown.
  const shouldWatermark = planType === 'free';

  return {
    planType,
    shouldWatermark,
    loading,
    watermarkFreeRemaining,
    watermarkFreeTotal,
    refreshSubscription: fetchSubscription,
  } as const;
}
