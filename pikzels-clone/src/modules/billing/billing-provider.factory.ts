/**
 * Billing Provider Factory
 *
 * Returns the active billing provider based on BILLING_PROVIDER env var.
 * Falls back to Demo provider if no real provider keys are configured.
 *
 * Usage:
 *   import { getBillingProvider } from '../billing';
 *   const provider = getBillingProvider();
 *   const result = await provider.createCheckoutSession(params);
 */

import type {
  BillingProvider,
  BillingProviderName,
} from './billing-provider.interface';
import { StripeBillingProvider } from './providers/stripe.provider';
import { PolarBillingProvider } from './providers/polar.provider';
import { DemoBillingProvider } from './providers/demo.provider';
import { logger } from '../../utils/logger';

const VALID_PROVIDERS: BillingProviderName[] = ['stripe', 'polar'];

/**
 * Get the active billing provider for NEW checkouts.
 * Reads BILLING_PROVIDER env var and validates that the required keys are present.
 * Falls back to Demo provider if keys are missing.
 */
export function getBillingProvider(): BillingProvider {
  const envProvider = (process.env.BILLING_PROVIDER || 'stripe') as string;

  // Validate against whitelist
  if (
    !VALID_PROVIDERS.includes(envProvider as BillingProviderName) &&
    envProvider !== 'demo'
  ) {
    logger.warn(
      `Invalid BILLING_PROVIDER "${envProvider}", falling back to stripe`
    );
  }

  if (envProvider === 'polar' && process.env.POLAR_ACCESS_TOKEN) {
    return PolarBillingProvider.getInstance();
  }

  if (
    (envProvider === 'stripe' ||
      !VALID_PROVIDERS.includes(envProvider as BillingProviderName)) &&
    process.env.STRIPE_SECRET_KEY
  ) {
    return StripeBillingProvider.getInstance();
  }

  // No real provider keys configured -- use demo mode
  return DemoBillingProvider.getInstance();
}

/**
 * Get a specific provider by name.
 * Used when managing an existing subscription that was created by a specific provider.
 * For example, a Stripe subscription must be cancelled via Stripe, even if the active
 * provider has been switched to Polar.
 */
export function getBillingProviderByName(
  name: BillingProviderName
): BillingProvider {
  switch (name) {
    case 'stripe':
      if (process.env.STRIPE_SECRET_KEY) {
        return StripeBillingProvider.getInstance();
      }
      break;
    case 'polar':
      if (process.env.POLAR_ACCESS_TOKEN) {
        return PolarBillingProvider.getInstance();
      }
      break;
    case 'demo':
      return DemoBillingProvider.getInstance();
  }

  // Fallback to demo if requested provider keys are missing
  logger.warn(`Provider "${name}" keys not configured, falling back to demo`);
  return DemoBillingProvider.getInstance();
}
