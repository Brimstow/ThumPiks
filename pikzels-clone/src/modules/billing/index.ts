/**
 * Billing Module Public API
 *
 * Re-exports the billing provider interface, factory, and types.
 * Other modules should import from here, not from internal files.
 */

export type {
  BillingProvider,
  BillingProviderName,
  CheckoutParams,
  CheckoutResult,
  CreditPackCheckoutParams,
  PortalSessionResult,
  Invoice,
  PaymentMethod,
} from './billing-provider.interface';

export {
  getBillingProvider,
  getBillingProviderByName,
} from './billing-provider.factory';
export { StripeBillingProvider } from './providers/stripe.provider';
export { PolarBillingProvider } from './providers/polar.provider';
export { DemoBillingProvider } from './providers/demo.provider';
