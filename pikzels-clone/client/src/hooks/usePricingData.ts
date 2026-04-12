import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// TypeScript interfaces matching the GET /api/subscription/pricing response
// ---------------------------------------------------------------------------

export interface PlanFeatures {
  aiThumbnails: number;
  resolution: string;
  watermark: boolean;
  watermarkFreeExports?: number;
  faceSwap: boolean | number;
  abTesting: boolean | number;
  analytics: boolean;
  support: string;
  privateModeDefault?: boolean;
  earlyAccess?: boolean;
  customTemplates?: boolean;
  frameExtractionsPerDay: number;
  frameRegeneratesPerUrl: number;
  [key: string]: unknown;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  /** Original (production) monthly price before any beta discount */
  originalMonthlyPrice: number;
  /** Original (production) annual price before any beta discount */
  originalAnnualPrice: number;
  /** Whether a beta discount is actively applied to this plan */
  hasDiscount: boolean;
  credits: number;
  displayThumbnails: number;
  features: PlanFeatures;
  popular: boolean;
  annualSavings: number;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  savings?: string;
  popular?: boolean;
}

export interface PricingFaq {
  question: string;
  answer: string;
}

export interface BetaPhaseInfo {
  id: string;
  name: string;
  badge: string;
  discountPercentMonthly: number;
  discountPercentAnnual: number;
}

export interface PricingData {
  phase: BetaPhaseInfo;
  spotsLeft: number | null;
  spotsTotal: number | null;
  endsAt: string | null;
  plans: PricingPlan[];
  creditPacks: CreditPack[];
  faqs: PricingFaq[];
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UsePricingDataResult {
  phase: BetaPhaseInfo | null;
  spotsLeft: number | null;
  spotsTotal: number | null;
  endsAt: string | null;
  plans: PricingPlan[];
  creditPacks: CreditPack[];
  faqs: PricingFaq[];
  loading: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Module-level cache — survives component unmount/remount within the same
// browser session. Pricing plans are static for the lifetime of a page load
// so there is no need to re-fetch on every navigation.
// ---------------------------------------------------------------------------

/** Resolved cache: populated after the first successful fetch. */
let pricingCache: PricingData | null = null;

/**
 * In-flight promise: shared across all hook instances so that parallel mounts
 * (e.g. landing page and pricing page both rendering at startup) issue only a
 * single network request instead of N simultaneous duplicate calls.
 */
let cachePromise: Promise<PricingData> | null = null;

function normalizePricingData(data: PricingData): PricingData {
  return {
    phase: data.phase ?? { id: 'production', name: 'Production', badge: '', discountPercentMonthly: 0, discountPercentAnnual: 0 },
    spotsLeft: data.spotsLeft ?? null,
    spotsTotal: data.spotsTotal ?? null,
    endsAt: data.endsAt ?? null,
    plans: (data.plans ?? []).map((plan) => ({
      ...plan,
      originalMonthlyPrice: plan.originalMonthlyPrice ?? plan.monthlyPrice,
      originalAnnualPrice: plan.originalAnnualPrice ?? plan.annualPrice,
      hasDiscount: plan.hasDiscount ?? false,
    })),
    creditPacks: data.creditPacks ?? [],
    faqs: data.faqs ?? [],
  };
}

async function fetchPricingDataWithCache(): Promise<PricingData> {
  if (pricingCache) {
    return pricingCache;
  }

  if (!cachePromise) {
    cachePromise = fetch('/api/subscription/pricing')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch pricing data (status ${res.status})`);
        }
        const data = await res.json() as PricingData;
        pricingCache = normalizePricingData(data);
        return pricingCache;
      })
      .catch((err) => {
        cachePromise = null;
        throw err;
      });
  }

  return cachePromise;
}

export async function prefetchPricingData(): Promise<PricingData | null> {
  try {
    return await fetchPricingDataWithCache();
  } catch (err) {
    console.error('Error prefetching pricing data:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// usePricingData hook
// ---------------------------------------------------------------------------

export function usePricingData(): UsePricingDataResult {
  // Seed state from cache immediately so components that mount after the first
  // fetch render with data on frame 1 — no loading spinner shown at all.
  const [phase, setPhase] = useState<BetaPhaseInfo | null>(pricingCache?.phase ?? null);
  const [spotsLeft, setSpotsLeft] = useState<number | null>(pricingCache?.spotsLeft ?? null);
  const [spotsTotal, setSpotsTotal] = useState<number | null>(pricingCache?.spotsTotal ?? null);
  const [endsAt, setEndsAt] = useState<string | null>(pricingCache?.endsAt ?? null);
  const [plans, setPlans] = useState<PricingPlan[]>(pricingCache?.plans ?? []);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>(pricingCache?.creditPacks ?? []);
  const [faqs, setFaqs] = useState<PricingFaq[]>(pricingCache?.faqs ?? []);
  const [loading, setLoading] = useState<boolean>(pricingCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cache already populated — nothing to do.
    if (pricingCache) {
      setPhase(pricingCache.phase);
      setSpotsLeft(pricingCache.spotsLeft);
      setSpotsTotal(pricingCache.spotsTotal);
      setEndsAt(pricingCache.endsAt);
      setPlans(pricingCache.plans);
      setCreditPacks(pricingCache.creditPacks);
      setFaqs(pricingCache.faqs);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPricingData = async () => {
      try {
        const data = await fetchPricingDataWithCache();

        if (!cancelled) {
          setPhase(data.phase);
          setSpotsLeft(data.spotsLeft);
          setSpotsTotal(data.spotsTotal);
          setEndsAt(data.endsAt);
          setPlans(data.plans);
          setCreditPacks(data.creditPacks);
          setFaqs(data.faqs);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching pricing data:', err);
          setError(
            err instanceof Error ? err.message : 'Failed to load pricing data'
          );
          setPlans([]);
          setCreditPacks([]);
          setFaqs([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPricingData();

    return () => {
      cancelled = true;
    };
  }, []); // Runs once per component mount; cache check makes subsequent mounts free.

  return { phase, spotsLeft, spotsTotal, endsAt, plans, creditPacks, faqs, loading, error };
}

export default usePricingData;
