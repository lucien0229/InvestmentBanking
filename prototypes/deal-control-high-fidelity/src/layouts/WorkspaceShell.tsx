import { Bell, ChevronDown, CircleHelp, FlaskConical, Menu, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Link, NavLink, useLocation } from '../router';
import { ContextInspector } from '../components/ContextInspector';
import { StatusBadge } from '../components/StatusBadge';
import { dealBasePath, navigationItems } from '../data/demoData';
import { useInspector } from '../hooks/useInspector';
import { usePrototypeState } from '../hooks/usePrototypeState';

export function WorkspaceShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const { record, closeInspector } = useInspector();
  const { state, resetDemo } = usePrototypeState();
  const [navOpen, setNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const globalActionsRef = useRef<HTMLDivElement>(null);
  const domainButtonRef = useRef<HTMLButtonElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setNavOpen(false);
    setNotificationsOpen(false);
    setAccountOpen(false);
    closeInspector();
  }, [location.pathname]);

  useEffect(() => {
    if (!notificationsOpen && !accountOpen) return;

    const closePopovers = () => {
      setNotificationsOpen(false);
      setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closePopovers();
      if (notificationsOpen) notificationButtonRef.current?.focus();
      else accountButtonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!globalActionsRef.current?.contains(event.target as Node)) closePopovers();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [accountOpen, notificationsOpen]);

  useEffect(() => {
    if (!navOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setNavOpen(false);
      domainButtonRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  return (
    <div className="prototype-root">
      <a className="skip-link" href="#main-content">Skip to main content</a>

      <header className="global-bar" data-od-id="global-header">
        <div className="brand-lockup" data-od-id="brand-lockup">
          <span className="brand-mark" aria-hidden="true">DC</span>
          <span className="brand-name">Deal Control</span>
          <span className="prototype-label">Interactive prototype</span>
        </div>
        <div className="global-actions" ref={globalActionsRef}>
          <div className="menu-wrap">
            <button
              ref={notificationButtonRef}
              className="icon-button"
              type="button"
              aria-label={state.decisionRecorded ? 'Open notifications' : 'Open notifications, one unread item'}
              aria-expanded={notificationsOpen}
              aria-controls="notification-menu"
              onClick={() => {
                setNotificationsOpen((value) => !value);
                setAccountOpen(false);
              }}
              data-od-id="notification-menu-button"
            >
              <Bell aria-hidden="true" size={18} />
              {!state.decisionRecorded ? <span className="notification-dot" aria-label="Unread notification" /> : null}
            </button>
            {notificationsOpen ? (
              <div className="popover" id="notification-menu" role="region" aria-label="Notifications" data-od-id="notifications-popover">
                <p className="popover-title">Requires your attention</p>
                <Link to={`${dealBasePath}/evidence-decisions`} className="popover-item">
                  <strong>Material conflict requires a decision</strong>
                  <span>Inspect the exact Evidence and version for CLM-018.</span>
                </Link>
                <Link to={`${dealBasePath}/actions`} className="popover-footer">Open Action Center</Link>
              </div>
            ) : null}
          </div>
          <div className="menu-wrap">
            <button
              ref={accountButtonRef}
              className="account-button"
              type="button"
              aria-expanded={accountOpen}
              aria-controls="account-menu"
              onClick={() => {
                setAccountOpen((value) => !value);
                setNotificationsOpen(false);
              }}
              data-od-id="account-menu-button"
            >
              <span className="avatar" aria-hidden="true">WB</span>
              <span className="account-copy"><strong>W. Banker</strong><small>Individual account</small></span>
              <ChevronDown aria-hidden="true" size={15} />
            </button>
            {accountOpen ? (
              <div className="popover account-popover" id="account-menu" role="region" aria-label="Account options" data-od-id="account-popover">
                <Link className="popover-item compact" to="/app/deals">
                  <ShieldCheck aria-hidden="true" size={16} />Banker Account
                </Link>
                <button className="popover-item compact reset-button" type="button" onClick={resetDemo}>
                  <RotateCcw aria-hidden="true" size={16} />Reset demo state
                </button>
                <a className="popover-item compact" href="#prototype-help">
                  <CircleHelp aria-hidden="true" size={16} />Prototype guidance
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="deal-context-bar" data-od-id="deal-context-header">
        <button
          ref={domainButtonRef}
          className="mobile-domain-button"
          type="button"
          aria-expanded={navOpen}
          aria-controls="domain-navigation"
          onClick={() => setNavOpen((value) => !value)}
          data-od-id="mobile-domain-menu"
        >
          {navOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          Work areas
        </button>
        <div className="deal-context-main">
          <div>
            <span className="context-kicker">Current Deal</span>
            <strong>Project Northstar</strong>
          </div>
          <span className="context-divider" aria-hidden="true" />
          <div><span className="context-kicker">Stage</span><strong>Preparation</strong></div>
          <StatusBadge tone="success">Paid Preflight passed</StatusBadge>
          <StatusBadge tone="neutral">Active</StatusBadge>
        </div>
        <div className="revision-context">
          <span>Current Revision</span>
          <strong className="mono">{state.currentRevision}</strong>
        </div>
      </div>

      <div className="synthetic-banner" role="note" aria-label="Project Northstar synthetic demo data. Companies, files, amounts, timestamps, hashes, and actions shown here do not represent a real transaction or production capability." data-od-id="synthetic-data-banner">
        <FlaskConical aria-hidden="true" size={15} />
        <strong>Project Northstar synthetic demo data</strong>
        <span>Companies, files, amounts, timestamps, hashes, and actions shown here do not represent a real transaction or production capability.</span>
      </div>

      <div className={`workspace-grid ${navOpen ? 'nav-is-open' : ''} ${record ? 'inspector-is-open' : ''}`}>
        <aside className="domain-sidebar" aria-label="Deal work areas">
          <nav id="domain-navigation" className="domain-nav" data-od-id="domain-navigation">
            <p className="nav-section-label">Work areas</p>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `domain-link ${isActive ? 'active' : ''}`}
                  data-od-id={item.dataOdId}
                >
                  <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
            <div className="nav-separator" />
            <p className="nav-section-label">Context</p>
            <Link className="domain-link muted-link" to={`${dealBasePath}/guide`} data-od-id="nav-first-deal-guide">
              <CircleHelp aria-hidden="true" size={17} />
              <span>First Deal Guide</span>
            </Link>
            <Link className="domain-link muted-link" to={`${dealBasePath}/setup`} data-od-id="nav-deal-controls">
              <ShieldCheck aria-hidden="true" size={17} />
              <span>Deal Controls</span>
            </Link>
          </nav>
          <div className="sidebar-foot" id="prototype-help">
            <span className="mono">DEMO · V0.1</span>
            <p>Local state is saved. Decisions and exports can be reset.</p>
          </div>
        </aside>

        {navOpen ? <button className="nav-scrim" type="button" onClick={() => { setNavOpen(false); domainButtonRef.current?.focus(); }} aria-label="Close work-area navigation" data-od-id="close-domain-navigation" /> : null}

        <main id="main-content" className="main-content" tabIndex={-1} data-od-id="workspace-main-content">
          <div className="small-screen-boundary" role="note">
            <MonitorBoundary />
          </div>
          {children}
        </main>
        <ContextInspector />
      </div>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation for narrow screens">
        {navigationItems.filter((item) => ['Overview', 'Action Center', 'Evidence & Decisions', 'History & Portability'].includes(item.label)).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
              <Icon aria-hidden="true" size={18} />
              <span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function MonitorBoundary() {
  return (
    <>
      <strong>Limited small-screen mode</strong>
      <span>You can inspect objects, states, Jobs, and history. Continue on desktop for material decisions, uploads, internal export creation, and external authorization.</span>
    </>
  );
}
