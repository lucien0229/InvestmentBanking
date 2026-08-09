import type { PropsWithChildren } from 'react';
import { Bell, CreditCard, Database, FileText, HelpCircle, LayoutList, LogOut, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { Link, useLocation } from '../router';

const accountItems = [
  { label: 'Deals', path: '/app/deals', icon: LayoutList },
  { label: 'Usage & plan', path: '/app/account/usage-plan', icon: SlidersHorizontal },
  { label: 'Billing & invoices', path: '/app/account/billing', icon: CreditCard },
  { label: 'Notifications', path: '/app/account/notifications', icon: Bell },
  { label: 'Account & security', path: '/app/account/security', icon: ShieldCheck },
  { label: 'Data, exports & deletion', path: '/app/account/data', icon: Database },
  { label: 'Help & support', path: '/app/account/help', icon: HelpCircle },
];

export function AccountShell({ children }: PropsWithChildren) {
  const { pathname } = useLocation();

  return (
    <div className="account-root">
      <a className="skip-link" href="#account-content">Skip to main content</a>
      <header className="account-header" data-od-id="account-header">
        <Link className="brand-lockup" to="/app/deals" data-od-id="account-brand-home">
          <span className="brand-mark" aria-hidden="true">DC</span><span className="brand-name">Deal Control</span><span className="prototype-label">Banker Account</span>
        </Link>
        <div className="account-identity"><span className="avatar" aria-hidden="true">WB</span><span><strong>W. Banker</strong><small>Individual account · Synthetic demo</small></span></div>
      </header>
      <div className="account-layout">
        <aside className="account-sidebar" aria-label="Account navigation">
          <nav id="account-navigation" className="account-nav" data-od-id="account-navigation">
            {accountItems.map((item) => {
              const Icon = item.icon;
              const active = item.path === '/app/deals' ? pathname === item.path : pathname.startsWith(item.path);
              return <Link key={item.path} className={`account-nav-link ${active ? 'active' : ''}`} to={item.path} aria-current={active ? 'page' : undefined}><Icon aria-hidden="true" size={17} /><span>{item.label}</span></Link>;
            })}
          </nav>
          <div className="account-sidebar-foot">
            <Link className="account-nav-link" to="/" data-od-id="account-return-public"><FileText aria-hidden="true" size={17} />Public product overview</Link>
            <Link className="account-nav-link" to="/account-access" data-od-id="account-sign-out"><LogOut aria-hidden="true" size={17} />Sign out securely</Link>
          </div>
        </aside>
        <main id="account-content" className="account-content" tabIndex={-1} data-od-id="account-main-content">{children}</main>
      </div>
    </div>
  );
}
