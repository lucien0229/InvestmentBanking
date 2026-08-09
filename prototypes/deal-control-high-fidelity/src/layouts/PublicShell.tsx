import type { PropsWithChildren } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useLocation } from '../router';

const publicItems = [
  { label: 'Project Northstar', path: '/project-northstar' },
  { label: 'How it works', path: '/how-it-works/evidence-and-decisions' },
  { label: 'Security & data use', path: '/security-data/confidentiality-and-processing' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Qualification', path: '/qualification' },
  { label: 'Resources', path: '/resources/synthetic-artifacts' },
];

export function PublicShell({ children }: PropsWithChildren) {
  const { pathname } = useLocation();

  return (
    <div className="public-root">
      <a className="skip-link" href="#public-content">Skip to main content</a>
      <header className="public-header" data-od-id="public-header">
        <Link className="brand-lockup public-brand" to="/" data-od-id="public-brand-home">
          <span className="brand-mark" aria-hidden="true">DC</span>
          <span className="brand-name">Deal Control</span>
        </Link>
        <nav className="public-nav" aria-label="Public site navigation" data-od-id="public-navigation">
          {publicItems.map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return <Link key={item.path} className={active ? 'active' : ''} to={item.path} aria-current={active ? 'page' : undefined}>{item.label}</Link>;
          })}
        </nav>
        <Link className="button button-secondary public-access-link" to="/account-access" data-od-id="public-account-access"><LockKeyhole aria-hidden="true" size={15} />Account access</Link>
      </header>
      <main id="public-content" className="public-main" tabIndex={-1} data-od-id="public-main-content">{children}</main>
      <footer className="public-footer" data-od-id="public-footer">
        <div><strong>Deal Control</strong><span>Controlled sell-side auction workspace · High-fidelity interactive prototype</span></div>
        <Link className="text-link" to="/qualification">Check fit<ArrowRight aria-hidden="true" size={14} /></Link>
      </footer>
    </div>
  );
}
