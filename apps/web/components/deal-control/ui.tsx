"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "warning" | "critical" | "success";

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className="dc-status-badge" data-tone={tone}>{children}</span>;
}

export function StatePanel({ tone = "info", label, title, detail, children }: { tone?: Tone; label: string; title: string; detail?: string; children?: ReactNode }) {
  return <section className="dc-state-panel" data-tone={tone} role={tone === "critical" ? "alert" : "status"} aria-live="polite">
    <span className="dc-state-label">{label}</span>
    <strong className="dc-state-title">{title}</strong>
    {detail ? <span className="dc-state-detail">{detail}</span> : null}
    {children}
  </section>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="dc-page-header">
    {eyebrow ? <p className="dc-eyebrow">{eyebrow}</p> : null}
    <h1>{title}</h1>
    {description ? <p>{description}</p> : null}
    {actions ? <div className="dc-page-actions">{actions}</div> : null}
  </header>;
}

export type CheckoutStep = "Order" | "Terms" | "Payment" | "Confirmation";

export function CheckoutStepper({ active }: { active: CheckoutStep }) {
  const steps: Array<[CheckoutStep, string]> = [["Order", "Confirm scope"], ["Terms", "Acknowledge boundaries"], ["Payment", "Provider checkout"], ["Confirmation", "Reconcile entitlement"]];
  const activeIndex = steps.findIndex(([label]) => label === active);
  return <nav className="dc-stepper" aria-label="Checkout steps">
    {steps.map(([label, description], index) => <div key={label} className="dc-step" data-active={label === active ? "true" : undefined} data-complete={index < activeIndex ? "true" : undefined}>
      <strong>{index + 1}. {label}</strong>
      <small>{index < activeIndex ? "Complete" : label === active ? "Current step" : description}</small>
    </div>)}
  </nav>;
}

export type DealSetupStep = "Deal identity" | "Business stage" | "Controlled purpose" | "Default restrictions" | "Confirm setup";

export function DealSetupStepper({ active }: { active: DealSetupStep }) {
  const steps: DealSetupStep[] = ["Deal identity", "Business stage", "Controlled purpose", "Default restrictions", "Confirm setup"];
  const activeIndex = steps.indexOf(active);
  return <nav className="dc-stepper dc-setup-stepper" aria-label="Deal Setup steps">
    {steps.map((label, index) => <div key={label} className="dc-step" data-active={label === active ? "true" : undefined} data-complete={index < activeIndex ? "true" : undefined}>
      <strong>0{index + 1}. {label}</strong>
      <small>{index < activeIndex ? "Complete" : label === active ? "Current step" : "Next checkpoint"}</small>
    </div>)}
  </nav>;
}

const dealNav = [
  ["Overview", "/app/deals/project-northstar/overview", true],
  ["Action Center", "/app/deals/project-northstar/actions", true],
  ["Sources", "/app/deals/project-northstar/sources", true],
  ["Evidence & Decisions", "/app/deals/project-northstar/evidence-decisions", true],
  ["Analysis", "/app/deals/project-northstar/analysis", true],
  ["Auction Process", "/app/deals/project-northstar/auction-process", true],
  ["Execution Package", "/app/deals/00000000-0000-0000-0000-000000000000/execution-package", true],
  ["Review & Readiness", "/app/deals/project-northstar/review-readiness", true],
  ["History & Portability", "/app/deals/project-northstar/history-portability", true],
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/app/account")) return <AccountShell>{children}</AccountShell>;
  const isSynthetic = pathname.includes("project-northstar") || pathname.includes("00000000-0000-0000-0000-000000000000");
  return <div className="dc-workspace-root">
    <a className="dc-skip-link" href="#main-content">Skip to main content</a>
    <header className="dc-global-bar">
      <a className="dc-brand" href="/app"><span className="dc-brand-mark" aria-hidden="true">DC</span><span>Deal Control</span></a>
      <small>{isSynthetic ? "Banker workspace · V1" : "Individual Banker account"}</small>
    </header>
    <div className="dc-context-bar">
      <div className="dc-context-copy">
        <div><span className="dc-context-kicker">Current Deal</span><strong>{isSynthetic ? "Project Northstar" : "No Deal selected"}</strong></div>
        <span className="dc-context-divider" aria-hidden="true" />
        <div><span className="dc-context-kicker">Stage</span><strong>{isSynthetic ? "Preparation" : "Setup"}</strong></div>
        {isSynthetic ? <StatusBadge tone="success">Paid Preflight passed</StatusBadge> : <StatusBadge>Account scope</StatusBadge>}
      </div>
      <span className="dc-mono">REV {isSynthetic ? "0.3" : "—"}</span>
    </div>
    {isSynthetic ? <div className="dc-synthetic-banner" role="note"><strong>Project Northstar synthetic demo data</strong><span>Companies, files, amounts, timestamps, hashes, and actions shown here do not represent a real transaction or production capability.</span></div> : null}
    <div className="dc-workspace-grid">
      <aside className="dc-workspace-sidebar" aria-label="Deal work areas">
        <nav className="dc-workspace-nav">
          <p className="dc-nav-label">Work areas</p>
          {dealNav.map(([label, href, implemented]) => implemented ? <a key={label} className="dc-nav-link" href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</a> : <span key={label} className="dc-nav-link" aria-disabled="true" title="This work area is outside the current implemented product scope">{label}</span>)}
          <p className="dc-nav-label">Context</p>
          <a className="dc-nav-link" href="/app/deals/project-northstar/setup">Deal Controls</a>
          <a className="dc-nav-link" href="/app/deals/project-northstar/guide">First Deal Guide</a>
          <a className="dc-nav-link" href="/app/account/usage-plan">Usage & plan</a>
        </nav>
        <div className="dc-sidebar-foot"><span className="dc-mono">V1 · DEVELOPMENT</span><p>Protected actions stay scoped to the current Account and Deal.</p></div>
      </aside>
      <div id="main-content" className="dc-workspace-content">{children}</div>
      <aside className="dc-workspace-inspector" aria-label="Deal context inspector"><p className="dc-nav-label">Context inspector</p><section className="dc-inspector-card"><span className="dc-eyebrow">Current workspace</span><h2>Project Northstar</h2><dl><dt>Stage</dt><dd>Preparation</dd><dt>Revision</dt><dd className="dc-mono">0.4</dd><dt>Source posture</dt><dd>Controlled / synthetic</dd></dl><StatusBadge tone="warning">External use blocked</StatusBadge><p>Review readiness, QC and exact authorization remain separate checkpoints.</p><a className="dc-inline-button" href="/app/deals/project-northstar/review-readiness">Inspect readiness →</a></section></aside>
    </div>
  </div>;
}

const accountNav = [["Deals", "/app/deals"], ["Usage & plan", "/app/account/usage-plan"], ["Billing & invoices", "/app/account/billing"], ["Notifications", "/app/account/notifications"], ["Account & security", "/app/account/security"], ["Data, exports & deletion", "/app/account/data"], ["Help & support", "/app/account/help"]] as const;

function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="dc-account-root">
    <a className="dc-skip-link" href="#account-content">Skip to main content</a>
    <header className="dc-account-header"><a className="dc-brand" href="/app/deals"><span className="dc-brand-mark" aria-hidden="true">DC</span><span>Deal Control</span></a><div className="dc-account-identity"><strong>W. Banker</strong><small>Individual account · Synthetic demo</small></div></header>
    <div className="dc-account-grid"><aside className="dc-account-sidebar" aria-label="Account navigation"><nav className="dc-workspace-nav">{accountNav.map(([label, href]) => <a key={href} className="dc-nav-link" href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</a>)}</nav><div className="dc-sidebar-foot"><a className="dc-nav-link" href="/">Public product overview</a><a className="dc-nav-link" href="/account-access">Sign out securely</a></div></aside><div id="account-content" className="dc-account-content">{children}</div></div>
  </div>;
}

export function RecipientShell({ children }: { children: ReactNode }) {
  return <div className="dc-recipient-root"><a className="dc-skip-link" href="#recipient-content">Skip to main content</a><header className="dc-recipient-header"><a className="dc-brand" href="/"><span className="dc-brand-mark" aria-hidden="true">DC</span><span>Deal Control</span></a><span className="dc-recipient-identity">Recipient Access · synthetic</span></header><main id="recipient-content" className="dc-recipient-content">{children}</main></div>;
}

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const items = [["Project Northstar", "/project-northstar", true], ["How it works", "/how-it-works/evidence-and-decisions", true], ["Security & data", "/security-data/confidentiality-and-processing", true], ["Pricing", "/pricing", true], ["Qualification", "/qualification", true], ["Resources", "/resources/recorded-walkthrough", true]] as const;
  return <div className="dc-public-root">
    <a className="dc-skip-link" href="#public-content">Skip to main content</a>
    <header className="dc-public-header">
      <a className="dc-brand" href="/"><span className="dc-brand-mark" aria-hidden="true">DC</span><span>Deal Control</span></a>
      <nav className="dc-public-nav" aria-label="Public site navigation">{items.map(([label, href, implemented]) => implemented ? <a key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>{label}</a> : <span key={href} aria-disabled="true" title="This public surface is outside the current implemented product scope">{label}</span>)}</nav>
      <a className="dc-public-access" href="/account-access">Account access</a>
    </header>
    <div id="public-content" className="dc-public-main">{children}</div>
    <footer className="dc-public-footer"><div><strong>Deal Control</strong><small>Controlled sell-side auction workspace · V1</small></div><a href="/qualification">Check fit →</a></footer>
  </div>;
}
