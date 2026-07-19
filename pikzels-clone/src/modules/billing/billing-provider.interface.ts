/**
 * Billing Provider Interface
 *
 * Defines the contract for all billing providers (Stripe, Polar, Demo).
 * Services call methods on this interface; the factory decides which
 * concrete implementation to return.
 */

// =========================================================================
// Errors
// =========================================================================

export type BillingErrorCode =
  | 'INVALID_EMAIL'
  | 'INVALID_PRODUCT'
  | 'PROVIDER_VALIDATION'
  | 'PROVIDER_AUTH'
  | 'PROVIDER_UNAVAILABLE'
  | 'UNKNOWN';

export class BillingError extends Error {
  readonly code: BillingErrorCode;
  readonly userMessage: string;
  readonly providerDetails: Record<string, unknown>;

  constructor(opts: {
    code: BillingErrorCode;
    message: string;
    userMessage: string;
    providerDetails?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.name = 'BillingError';
    this.code = opts.code;
    this.userMessage = opts.userMessage;
    this.providerDetails = opts.providerDetails ?? {};
  }
}

// =========================================================================
// Shared Types
// =========================================================================

export type BillingProviderName = 'stripe' | 'polar' | 'demo';

export interface CheckoutParams {
  userId: string;
  email: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  /** Provider-specific product/price ID, resolved by subscription.config.ts */
  productId: string;
  successUrl: string;
  cancelUrl: string;
  /** Polar discount ID to auto-apply at checkout (beta pricing) */
  discountId?: string | undefined;
  /** Allow users to enter promo codes at checkout (e.g. LAUNCH15) */
  allowDiscountCodes?: boolean | undefined;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
}

export interface CreditPackCheckoutParams {
  userId: string;
  email: string;
  packId: string;
  packName: string;
  credits: number;
  /** Price in dollars (not cents) */
  price: number;
  successUrl: string;
  cancelUrl: string;
}

export interface PortalSessionResult {
  url: string;
}

export interface Invoice {
  id: string;
  date: string;
  description: string;
  /** Amount in cents */
  amount: number;
  status: string;
  type: string;
  invoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

// =========================================================================
// Provider Interface
// =========================================================================

export interface BillingProvider {
  readonly providerName: BillingProviderName;

  /**
   * Create or retrieve a customer ID for the given user.
   * Stores the customer ID on the User record.
   */
  createOrGetCustomer(userId: string, email: string): Promise<string>;

  /**
   * Create a subscription checkout session.
   * Returns a URL to redirect the user to.
   */
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult>;

  /**
   * Create a one-time payment checkout session for a credit pack.
   * Returns the checkout URL.
   */
  createCreditPackCheckout(params: CreditPackCheckoutParams): Promise<string>;

  /**
   * Cancel a subscription (at period end).
   * @param providerSubscriptionId - The Stripe subscription ID or Polar subscription ID
   */
  cancelSubscription(providerSubscriptionId: string): Promise<void>;

  /**
   * Create a customer portal / billing management session.
   * Returns a URL to redirect the user to.
   */
  createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<PortalSessionResult>;

  /**
   * Fetch invoice history for a customer.
   */
  getInvoices(customerId: string, limit: number): Promise<Invoice[]>;

  /**
   * Fetch saved payment methods for a customer.
   */
  getPaymentMethods(customerId: string): Promise<PaymentMethod[]>;
}
