# Controlled Sell-Side Auction Execution Workspace V1 Map

## Notes

Ticket 03 is resolved for the authorized development environment. Its development release is layered on the existing Ticket 02 release; no downstream ticket scope is advanced by this entry.

Ticket 04 is resolved for the authorized development environment. Its durable Reference Job release is layered on Tickets 01–03; no later-ticket scope is advanced by this entry.

Ticket 05 is resolved for the authorized development environment. Supabase dev data was preserved, the new release is live at `/opt/investmentbanking/releases/20260901-ticket05-dev-v2`, and public HTTPS/browser verification passed; prior application release directories were removed per explicit no-rollback authorization. No downstream ticket scope is advanced by this entry.

## Decisions-so-far

- Ticket 03 development resolution: see [03-qualified-checkout-entitlement.md](issues/03-qualified-checkout-entitlement.md).
- Ticket 04 development resolution: see [04-durable-reference-job.md](issues/04-durable-reference-job.md).
- Ticket 05 implementation/evidence boundary: see [05-deal-setup-paid-preflight.md](issues/05-deal-setup-paid-preflight.md); development deployment is verified, while production/provider/restore evidence remains deferred.
- Development evidence is explicitly separated from live Stripe collection, live tax/invoice behavior, production provider configuration, and production recovery evidence.

## Fog

- Production Stripe mode and tax/invoice/refund/renewal behavior remain deferred; provider-side current-object lookup, independent outbox consumer, and INT-DEF-003 raw replay posture remain deferred. Review follow-ups include binding qualification to checkout, explicit payment-failure/recovery states, and the checkout-session projection/header conformance. Stripe Test Mode Checkout and the endpoint-specific Webhook secret are configured for development.
- Ticket 04 production evidence remains deferred for real PGMQ/independent worker processes, OS-kill/watchdog recovery, continuous SSE, dependency-directed resume, and AC-071 production-shaped p95 measurements.
- Ticket 05 production evidence remains deferred for live providers, Confidential/Restricted processing, independent recovery, and restore measurements; local/development evidence must not be promoted to production proof.
