import type { PropsWithChildren } from 'react';
import { LockKeyhole } from 'lucide-react';

export function RecipientShell({ children }: PropsWithChildren) {
  return (
    <div className="recipient-root">
      <a className="skip-link" href="#recipient-content">Skip to main content</a>
      <header className="recipient-header" data-od-id="recipient-header">
        <span className="brand-mark" aria-hidden="true">DC</span>
        <div><strong>Secure Recipient Access</strong><small><LockKeyhole aria-hidden="true" size={13} />Limited to one exact authorized Revision</small></div>
      </header>
      <main id="recipient-content" className="recipient-main" tabIndex={-1} data-od-id="recipient-main-content">{children}</main>
      <footer className="recipient-footer">No Deal navigation · No editing · No download · No forwarding</footer>
    </div>
  );
}
