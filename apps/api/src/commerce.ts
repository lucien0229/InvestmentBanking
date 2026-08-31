import crypto from "node:crypto";
import Stripe from "stripe";
import { z } from "zod";

export const publicOffer = {
  product_code: "individual-deal-desk-v1",
  capability_version: "v1.0.0",
  currency: "usd",
  monthly: { amount_minor: 99500, display: "$995 per month", renewal: "monthly" },
  annual: { amount_minor: 1095000, display: "$10,950 per year paid upfront", renewal: "annual", monthly_equivalent_minor: 91250, savings_minor: 99000, discount_percent: 8.29 },
  included_active_deals: 2,
  allowances: {
    per_active_deal_per_billing_month: {
      newly_processed_files: 250,
      newly_processed_logical_pages: 2500,
      active_storage_gb: 25,
      full_workflow_operations: 20,
    },
  },
  add_ons: [
    { code: "additional_active_deal", monthly_amount_minor: 50000, annual_amount_minor: 550000, effect: "one additional Active Deal with the same allowance" },
    { code: "intensive_processing", amount_minor: 100000, effect: "5,000 logical pages and 20 Full-Workflow Operations for one affected Active Deal-month" },
    { code: "archive_capacity", monthly_amount_minor: 5000, effect: "additional 250 GB after export/delete is offered" },
  ],
  unmetered_actions: [
    "evidence_inspection",
    "correction",
    "deterministic_validation",
    "qc",
    "review",
    "human_decision",
    "targeted_revision",
    "internal_controlled_export",
    "product_failure_recovery",
  ],
  guarantee: "first-deal-control-loop-v1",
  cancellation: "cancels_next_renewal_only",
  tax: "calculated_before_payment_confirmation",
} as const;

export interface CheckoutProviderAdapter {
  readonly name: "stripe_test_adapter" | "stripe_live_adapter";
  createHostedSession(input: { checkoutOrderId: string; billingTerm: BillingTerm; addOn: AddOnCode }): Promise<{ providerSessionId: string; hostedUrl: string }>;
  getHostedSessionUrl?(providerSessionId: string): string;
}

export type BillingTerm = "monthly" | "annual";
export type AddOnCode = "none" | "additional_active_deal" | "intensive_processing" | "archive_capacity";

/** Isolated contract-compatible adapter used only when live Stripe credentials are absent. */
export class StripeTestCheckoutAdapter implements CheckoutProviderAdapter {
  readonly name = "stripe_test_adapter" as const;
  async createHostedSession(input: { checkoutOrderId: string; billingTerm: BillingTerm; addOn: AddOnCode }) {
    const providerSessionId = `cs_test_${crypto.randomUUID()}`;
    return { providerSessionId, hostedUrl: `https://checkout.stripe.test/${providerSessionId}?order=${encodeURIComponent(input.checkoutOrderId)}` };
  }
  getHostedSessionUrl(providerSessionId: string) { return `https://checkout.stripe.test/${providerSessionId}`; }
}

type StripeCheckoutSession = { id: string; url?: string | null };
export type StripeCheckoutClient = {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>, options?: { idempotencyKey?: string }): Promise<StripeCheckoutSession>;
    };
  };
};

export type StripePriceConfiguration = {
  monthly: string;
  annual: string;
  additional_active_deal_monthly: string;
  additional_active_deal_annual: string;
  intensive_processing: string;
  archive_capacity_monthly: string;
};

export type StripeCheckoutAdapterOptions = {
  secretKey: string;
  webOrigin: string;
  prices: StripePriceConfiguration;
  client?: StripeCheckoutClient;
};

/** Real Stripe Checkout adapter. It is enabled only when the complete env configuration is present. */
export class StripeCheckoutAdapter implements CheckoutProviderAdapter {
  readonly name = "stripe_live_adapter" as const;
  private readonly client: StripeCheckoutClient;
  private readonly webOrigin: string;
  private readonly prices: StripePriceConfiguration;

  constructor(options: StripeCheckoutAdapterOptions) {
    if (!options.secretKey.startsWith("sk_")) throw new Error("A Stripe secret key is required for the live adapter");
    this.client = options.client ?? (new Stripe(options.secretKey, { apiVersion: "2026-08-26.dahlia" }) as unknown as StripeCheckoutClient);
    this.webOrigin = options.webOrigin.replace(/\/$/, "");
    this.prices = options.prices;
  }

  static fromEnv() {
    const required = [
      "STRIPE_SECRET_KEY",
      "STRIPE_PRICE_MONTHLY",
      "STRIPE_PRICE_ANNUAL",
      "STRIPE_PRICE_ADDITIONAL_ACTIVE_DEAL_MONTHLY",
      "STRIPE_PRICE_ADDITIONAL_ACTIVE_DEAL_ANNUAL",
      "STRIPE_PRICE_INTENSIVE_PROCESSING",
      "STRIPE_PRICE_ARCHIVE_CAPACITY_MONTHLY",
    ] as const;
    if (required.some((name) => !process.env[name])) return null;
    return new StripeCheckoutAdapter({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webOrigin: process.env.PUBLIC_WEB_ORIGIN ?? process.env.HOST ?? "http://localhost:3000",
      prices: {
        monthly: process.env.STRIPE_PRICE_MONTHLY!,
        annual: process.env.STRIPE_PRICE_ANNUAL!,
        additional_active_deal_monthly: process.env.STRIPE_PRICE_ADDITIONAL_ACTIVE_DEAL_MONTHLY!,
        additional_active_deal_annual: process.env.STRIPE_PRICE_ADDITIONAL_ACTIVE_DEAL_ANNUAL!,
        intensive_processing: process.env.STRIPE_PRICE_INTENSIVE_PROCESSING!,
        archive_capacity_monthly: process.env.STRIPE_PRICE_ARCHIVE_CAPACITY_MONTHLY!,
      },
    });
  }

  async createHostedSession(input: { checkoutOrderId: string; billingTerm: BillingTerm; addOn: AddOnCode }) {
    if (input.billingTerm === "annual" && input.addOn === "archive_capacity") throw new Error("Archive capacity is a monthly-only V1 pack");
    const basePrice = input.billingTerm === "monthly" ? this.prices.monthly : this.prices.annual;
    const addOnPrice = input.addOn === "none" ? null
      : input.addOn === "additional_active_deal" ? (input.billingTerm === "monthly" ? this.prices.additional_active_deal_monthly : this.prices.additional_active_deal_annual)
        : input.addOn === "intensive_processing" ? this.prices.intensive_processing
          : this.prices.archive_capacity_monthly;
    const params: Record<string, unknown> = {
      mode: "subscription",
      // Managed Payments requires product tax codes. V1 tax is intentionally
      // deferred, so disable the account default for this development flow.
      managed_payments: { enabled: false },
      line_items: [{ price: basePrice, quantity: 1 }, ...(addOnPrice ? [{ price: addOnPrice, quantity: 1 }] : [])],
      success_url: `${this.webOrigin}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.webOrigin}/checkout/payment?checkout_order_id=${encodeURIComponent(input.checkoutOrderId)}`,
      client_reference_id: input.checkoutOrderId,
      metadata: { checkout_order_id: input.checkoutOrderId, billing_term: input.billingTerm, add_on: input.addOn },
    };
    const session = await this.client.checkout.sessions.create(params, { idempotencyKey: `checkout-order:${input.checkoutOrderId}` });
    if (!session.id) throw new Error("Stripe Checkout did not return a session id");
    return { providerSessionId: session.id, hostedUrl: session.url ?? `https://checkout.stripe.com/c/pay/${session.id}` };
  }

  getHostedSessionUrl(providerSessionId: string) { return `https://checkout.stripe.com/c/pay/${providerSessionId}`; }
}

const stripeObjectSchema = z.object({
  id: z.string().min(1),
  payment_intent: z.string().min(1).nullable().optional(),
  payment_status: z.string().min(1).nullable().optional(),
  amount_total: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().min(1).nullable().optional(),
  metadata: z.record(z.string(), z.string()).nullable().optional(),
}).passthrough();

export const stripeEventSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.string().min(1),
  api_version: z.string().min(1).optional(),
  data: z.object({ object: stripeObjectSchema }).passthrough(),
}).passthrough();

export function stripeEventId(raw: unknown) {
  const parsed = z.object({ id: z.string().min(1) }).passthrough().safeParse(raw);
  return parsed.success ? parsed.data.id : undefined;
}

export type CanonicalStripeEvent = {
  type: string;
  api_version: string;
  data: { object: { id: string; payment_intent?: string; payment_status?: string; amount_total?: number; currency?: string; metadata?: { checkout_order_id?: string } } };
};

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, sortValue(item)]));
  return value;
}

export function stableJson(value: unknown) {
  return JSON.stringify(sortValue(value));
}

export function canonicalizeStripeEvent(raw: unknown): CanonicalStripeEvent {
  const parsed = stripeEventSchema.parse(raw);
  const object = parsed.data.object;
  return {
    type: parsed.type,
    api_version: parsed.api_version ?? "unknown",
    data: {
      object: {
        id: object.id,
        ...(object.payment_intent ? { payment_intent: object.payment_intent } : {}),
        ...(object.payment_status ? { payment_status: object.payment_status } : {}),
        ...(object.amount_total !== undefined && object.amount_total !== null ? { amount_total: object.amount_total } : {}),
        ...(object.currency ? { currency: object.currency } : {}),
        ...(object.metadata?.checkout_order_id ? { metadata: { checkout_order_id: object.metadata.checkout_order_id } } : {}),
      },
    },
  };
}

export function canonicalDigest(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

export function rawPayloadDigest(rawBody: string) {
  return `sha256:${crypto.createHash("sha256").update(rawBody, "utf8").digest("hex")}`;
}

export function verifyStripeSignature(rawBody: string, header: string | undefined, secret: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = new Map(header.split(",").map((item) => item.split("=", 2) as [string, string]));
  const timestamp = Number(parts.get("t"));
  const signature = parts.get("v1");
  if (!Number.isSafeInteger(timestamp) || !signature || Math.abs(nowSeconds - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}

export function checkoutContractDigest(term: "monthly" | "annual", addOn: "none" | "additional_active_deal" | "intensive_processing" | "archive_capacity" = "none") {
  return canonicalDigest({
    contract_version: "commerce-contract-v1.0.0",
    product_code: publicOffer.product_code,
    capability_version: publicOffer.capability_version,
    billing_term: term,
    add_on: addOn,
    amount_minor: checkoutAmount(term, addOn),
    currency: publicOffer.currency,
    included_active_deals: publicOffer.included_active_deals,
    allowances: publicOffer.allowances,
    add_ons: publicOffer.add_ons,
    unmetered_actions: publicOffer.unmetered_actions,
    guarantee: publicOffer.guarantee,
    cancellation: publicOffer.cancellation,
    annual_equivalent: { monthly_equivalent_minor: publicOffer.annual.monthly_equivalent_minor, savings_minor: publicOffer.annual.savings_minor, discount_percent: publicOffer.annual.discount_percent },
    tax: publicOffer.tax,
  });
}

export function checkoutAmount(term: "monthly" | "annual", addOn: "none" | "additional_active_deal" | "intensive_processing" | "archive_capacity") {
  const base = term === "monthly" ? publicOffer.monthly.amount_minor : publicOffer.annual.amount_minor;
  if (addOn === "none") return base;
  if (addOn === "additional_active_deal") return base + (term === "monthly" ? 50000 : 550000);
  if (addOn === "intensive_processing") return base + 100000;
  if (term !== "monthly") throw new Error("archive capacity is monthly-only in the confirmed V1 contract");
  return base + 5000;
}
