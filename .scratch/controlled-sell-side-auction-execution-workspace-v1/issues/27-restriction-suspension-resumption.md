# 27 — Recover Account security and explicitly resume Recipient Access

**What to build:** Recover an existing Individual Banker through the Supabase-backed Magic Link recovery contract, restore the mandatory Passkey posture, and enforce Account Security Restriction and Payment Dispute as reversible product restrictions that immediately suspend otherwise-valid Recipient Access without falsifying authorization or history. Require a fresh ordinary Banker session plus Sensitive Action Grant for each explicit Recipient Access Resumption.

**Blocked by:** 03 — Turn a qualified buyer into a reconciled Individual entitlement; 26 — Authorize, deliver and observe one exact external Revision.

**Status:** ready-for-agent

- [ ] Existing-user recovery uses only the Supabase-backed Magic Link recovery path defined by ADR 0041, invalidates affected ordinary sessions and grants, and permits only a purpose-bound Security Recovery Session with an absolute lifetime no longer than 15 minutes and no Account/Deal content authority.
- [ ] Recovery cannot restore ordinary product use until the Banker re-establishes the mandatory Passkey posture; password, TOTP, SMS OTP, and support/operator impersonation are not recovery alternatives.
- [ ] An open Payment Dispute or Account Security Restriction immediately denies every prospective read through otherwise-valid Recipient Access and invalidates Recipient Sessions and stream grants.
- [ ] Suspension preserves the exact Access, External-Use Decision, Authorized Delivery, and prior Actual External Use history rather than marking them revoked or rewriting occurrence.
- [ ] Clearing every cause restores only the applicable Account/entitlement posture; it never restores Recipient Access automatically.
- [ ] Each still-valid Access requires an authenticated Banker, current authority, exact Sensitive Action Grant, explicit Resumption command, and new Recipient verification/session.
- [ ] Expiry, invalidation, permanent loss of accountable Actor, deletion, Post-Term entry, and lost dispute remain independent revoke/terminate outcomes and cannot be resumed.
- [ ] Safe unavailable states do not reveal whether an Account, Deal, Deliverable, Banker, or other Recipient exists; duplicate restriction/resumption events remain idempotent.
- [ ] The end-to-end suite implements CONTEXT, ADR 0037, and applicable AC-060 through AC-065 rather than the subordinate prototype's obsolete revocation question.
