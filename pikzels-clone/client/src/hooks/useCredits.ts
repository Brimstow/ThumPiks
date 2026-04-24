import { useQuery, QueryClient } from '@tanstack/react-query';
import { authGet } from '@/utils/api';

interface Subscription {
  id: string;
  planType: string;
  creditsBalance: number;
  creditsUsed: number;
  addonCreditsBalance: number;
  addonCreditsUsed: number;
  periodStart: string;
  periodEnd: string;
  billingCycle: string;
  status: string;
}

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

export interface CreditsData {
  subscription: Subscription | null;
  transactions: CreditTransaction[];
}

async function fetchCreditsData(): Promise<CreditsData> {
  const [subResponse, txResponse] = await Promise.all([
    authGet('/api/subscription/current'),
    authGet('/api/credits/transactions'),
  ]);

  if (!subResponse.ok) {
    throw new Error('Failed to fetch subscription');
  }
  if (!txResponse.ok) {
    throw new Error('Failed to fetch transactions');
  }

  const subData = await subResponse.json();
  const txData = await txResponse.json();

  // Handle both wrapped and unwrapped response formats
  const subscription = subData.subscription || subData;
  const transactions = txData.transactions || [];

  return {
    subscription,
    transactions,
  };
}

export function useCredits() {
  return useQuery({
    queryKey: ['credits'],
    queryFn: fetchCreditsData,
    refetchInterval: 2000, // Poll every 2 seconds for faster sync
    staleTime: 2000,
    refetchOnWindowFocus: true,
  });
}

// Optimistic credit deduction helper - call this before API call for instant UI feedback
export function optimisticDeductCredits(queryClient: QueryClient, amount: number) {
  const previousData = queryClient.getQueryData<CreditsData>(['credits']);

  if (previousData?.subscription) {
    queryClient.setQueryData<CreditsData>(['credits'], (old: CreditsData | undefined) => {
      if (!old?.subscription) return old;
      return {
        ...old,
        subscription: {
          ...old.subscription,
          creditsBalance: Math.max(0, old.subscription.creditsBalance - amount),
        },
      };
    });
  }

  return { previousData };
}

// Rollback helper - call this in onError to restore previous state
export function rollbackCredits(queryClient: QueryClient, previousData: CreditsData | undefined) {
  if (previousData) {
    queryClient.setQueryData(['credits'], previousData);
  }
}

// Helper to calculate credit breakdown
export function calculateCreditBreakdown(subscription: Subscription | null) {
  if (!subscription) {
    return {
      planCreditsTotal: 0,
      planCreditsUsed: 0,
      planCreditsRemaining: 0,
      addonCreditsTotal: 0,
      addonCreditsUsed: 0,
      addonCreditsRemaining: 0,
      totalCredits: 0,
      totalUsed: 0,
      totalRemaining: 0,
    };
  }

  const planCreditsTotal = subscription.creditsBalance + subscription.creditsUsed;
  const addonCreditsTotal = subscription.addonCreditsBalance + subscription.addonCreditsUsed;

  return {
    planCreditsTotal,
    planCreditsUsed: subscription.creditsUsed,
    planCreditsRemaining: subscription.creditsBalance,
    addonCreditsTotal,
    addonCreditsUsed: subscription.addonCreditsUsed,
    addonCreditsRemaining: subscription.addonCreditsBalance,
    totalCredits: planCreditsTotal + addonCreditsTotal,
    totalUsed: subscription.creditsUsed + subscription.addonCreditsUsed,
    totalRemaining: subscription.creditsBalance + subscription.addonCreditsBalance,
  };
}

// Helper to calculate average daily usage
export function calculateDailyUsage(transactions: CreditTransaction[], days: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentUsage = transactions
    .filter(tx => tx.type === 'usage' && tx.amount < 0)
    .filter(tx => new Date(tx.createdAt) >= cutoffDate);

  const totalUsed = recentUsage.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  return Math.round(totalUsed / days);
}

// Helper to calculate days remaining until period end
export function calculateDaysRemaining(periodEnd: string): number {
  const end = new Date(periodEnd);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}
