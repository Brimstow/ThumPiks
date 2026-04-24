import { SUBSCRIPTION_PLANS } from '../subscription.config';

describe('subscription.config - queuePriority', () => {
  it('every plan has a queuePriority field in features', () => {
    for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      expect(plan.features).toHaveProperty('queuePriority');
      expect(typeof plan.features.queuePriority).toBe('number');
    }
  });

  it('ultra_pro has priority 1 (highest)', () => {
    expect(SUBSCRIPTION_PLANS.ultra_pro.features.queuePriority).toBe(1);
  });

  it('free, starter, and pro have priority 10 (standard)', () => {
    expect(SUBSCRIPTION_PLANS.free.features.queuePriority).toBe(10);
    expect(SUBSCRIPTION_PLANS.starter.features.queuePriority).toBe(10);
    expect(SUBSCRIPTION_PLANS.pro.features.queuePriority).toBe(10);
  });

  it('lower number means higher priority (ultra_pro < others)', () => {
    const ultraProPriority = SUBSCRIPTION_PLANS.ultra_pro.features.queuePriority;
    const freePriority = SUBSCRIPTION_PLANS.free.features.queuePriority;
    expect(ultraProPriority).toBeLessThan(freePriority);
  });
});
