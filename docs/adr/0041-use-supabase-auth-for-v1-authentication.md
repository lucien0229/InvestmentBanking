---
status: accepted
---

# Use Supabase Auth for V1 authentication

V1 replaces Clerk with Supabase Auth for Account-side authentication while retaining product-owned Actor identity, Account ownership, Deal authorization, Product Entitlements, Recipient Access, and every business permission. This supersedes ADR 0010 without changing ADR 0011's United States-region Supabase Pro data-plane decisions or weakening private schemas, runtime roles, forced RLS, queues, PITR, backups, or object controls.

## Authentication flow

- First access uses Supabase's default Magic Link to confirm mailbox control; Supabase sends it through the existing Resend provider as Custom SMTP, without a Send Email Auth Hook.
- The confirmed user must register at least one Passkey before the product permits an ordinary Banker Session or any Account or Deal access.
- V1 enables no password credential, numeric Email OTP customization, TOTP, MFA enrollment, or other complex factor flow.
- An existing user with no usable Passkey may use Magic Link only to enter the existing Account Security Restriction and Security Recovery Session. Recovery exposes no Account or Deal content, permits credential recovery and prior-Session/Grant invalidation, and requires a new Passkey login after clearance; Recipient Access never resumes automatically.
- Sensitive operations retain the existing fresh-strong-authentication contract. A new Passkey login supplies evidence no older than five minutes, after which the product may issue the existing five-minute, single-use Sensitive Action Grant bound to the exact Session, Actor, action, resource, command, and preconditions. The product accepts this evidence only from the verified current Session JWT's `amr` entry whose method is `passkey` and whose timestamp is no older than five minutes; JWT issue time, browser state, or a `magiclink` entry alone does not qualify.

## Session and authorization

- The ordinary Banker identity is the Supabase Session. Next.js stores and refreshes it through the Supabase SSR Cookie contract, forwards only the current Access Token to Fastify, and does not create a second general product Session.
- Fastify and the Protected Object Gateway verify the Supabase JWT against pinned issuer, audience, algorithm, expiry, and JWKS expectations, then map issuer and subject through the product-owned external identity, Actor, and Account relationship.
- The direct quarantine TUS path uses a fresh Bearer from the same Supabase Session. Product security epochs, current relationships, exact resource authorization, Storage RLS, and every narrow product-issued Session or Grant remain independently enforced.
- Supabase Auth keeps the default one-hour JWT lifetime, refresh-token rotation behavior, and authentication-code lifetime. V1 configures a 12-hour inactivity timeout, seven-day absolute Session lifetime, and one active Session per user.

## Integration and identity lifecycle

- The Product API alone idempotently creates or links `external_identity → Actor → Account` after verified authentication. V1 removes the Clerk Webhook and adds no general Supabase Auth Hook, Database Webhook, or `auth.users` Trigger that can create or mirror product identity or authority.
- Product-controlled recovery, logout, and final identity deletion use narrow Supabase Auth administration operations and advance the product security epoch where applicable.
- External Recipients remain outside Supabase Auth and continue to use the product-owned one-time-link, email-code, and isolated Recipient Session contract.
- An accepted Account or Deal deletion removes every ordinary product relationship and Session but retains the minimal Supabase issuer-and-subject binding required by the Deletion Status Claimant. That identity can obtain only a short-lived Deletion Status Grant and is deleted 30 days after terminal deletion completion or resolution of any preservation exception.

## Consequences

Supabase Passkey is experimental. V1 permits the minimum explicit configuration needed to enable Passkey, bind the production Site URL, relying-party ID, and origins, and deliver production authentication email, but requires a pinned SDK/configuration plus production-shaped registration, login, recovery, and reauthentication probes before Confidential Deal Material is enabled. Failed capability evidence blocks launch or the affected sensitive operation and never silently downgrades fresh strong authentication to Magic Link alone.
