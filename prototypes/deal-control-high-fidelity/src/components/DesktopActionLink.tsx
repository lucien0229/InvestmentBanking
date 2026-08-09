import { Check, Copy, MonitorUp, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PropsWithChildren } from 'react';
import { Link } from '../router';

interface DesktopActionLinkProps extends PropsWithChildren {
  to: string;
  className?: string;
  scope: string;
  dataOdId: string;
}

export function DesktopActionLink({ to, className = 'button button-primary', scope, dataOdId, children }: DesktopActionLinkProps) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (window.matchMedia('(max-width: 1023px)').matches) {
      event.preventDefault();
      setNotice('');
      setOpen(true);
    }
  }

  function closeDialog() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <Link ref={triggerRef} className={className} to={to} onClick={handleClick} data-od-id={dataOdId}>
        {children}
      </Link>
      {open ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="desktop-handoff-title" aria-describedby="desktop-handoff-description" tabIndex={-1} ref={dialogRef}>
            <div className="dialog-heading">
              <MonitorUp aria-hidden="true" size={20} />
              <div>
                <p className="eyebrow">Limited small-screen mode</p>
                <h2 id="desktop-handoff-title">Continue on desktop</h2>
              </div>
              <button type="button" className="icon-button" onClick={closeDialog} aria-label="Close desktop handoff">
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <p id="desktop-handoff-description">This action changes {scope} and requires the full workspace for Evidence, Impact, and version checks. Your current progress is preserved.</p>
            <div className="dialog-actions">
              <button type="button" className="button button-secondary" onClick={() => setNotice('Secure link copied (prototype simulation).')}>
                <Copy aria-hidden="true" size={16} />Copy secure link
              </button>
              <button type="button" className="button button-primary" onClick={() => setNotice('Secure link sent to the account email (prototype simulation).')}>
                <Send aria-hidden="true" size={16} />Send to account email
              </button>
            </div>
            {notice ? <p className="dialog-notice" role="status"><Check aria-hidden="true" size={15} />{notice}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
