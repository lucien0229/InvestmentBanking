import { Check, KeyRound, LockKeyhole, MailCheck, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePrototypeState } from '../hooks/usePrototypeState';
import { Link, useNavigate } from '../router';

export type AccountAccessMode =
  | 'default'
  | 'email-sent'
  | 'verify-email'
  | 'passkey-register'
  | 'passkey-sign-in'
  | 'reauthenticate'
  | 'recovery'
  | 'recovery-restricted'
  | 'expired'
  | 'denied';

interface AccessShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
  dataOdId: string;
}

function AccessShell({ eyebrow, title, description, children, footer, dataOdId }: AccessShellProps) {
  return (
    <main className="access-page" data-od-id={dataOdId}>
      <section className="access-panel" aria-labelledby="account-access-title" data-od-id={`${dataOdId}-panel`}>
        <span className="brand-mark" aria-hidden="true">DC</span>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="account-access-title" data-od-id={`${dataOdId}-title`}>{title}</h1>
        <p>{description}</p>
        {children}
        {footer ? <div className="access-links">{footer}</div> : null}
      </section>
    </main>
  );
}

function RecoverySession() {
  const { state, replaceRecoveryPasskey, clearSecurityRestriction } = usePrototypeState();

  return (
    <AccessShell
      eyebrow="Security Recovery Session"
      title="Recover account security without opening Deal content"
      description="This 15-minute recovery session exposes only privacy-safe restriction status and credential controls. It grants no Account or Deal access."
      dataOdId="security-recovery-session"
      footer={<Link className="text-link" to="/account-access">Leave recovery safely</Link>}
    >
      <div className="access-state-list" aria-label="Recovery restrictions">
        <div><ShieldAlert aria-hidden="true" size={18} /><span><strong>Account security restriction active</strong><small>Ordinary sessions and unused Sensitive Action Grants are invalid.</small></span></div>
        <div><LockKeyhole aria-hidden="true" size={18} /><span><strong>2 suspended access records</strong><small className="mono">RA-••18 · RA-••24 · no recipient or Deal content shown</small></span></div>
        <div><KeyRound aria-hidden="true" size={18} /><span><strong>New Passkey login required after clearance</strong><small>Clearing this restriction does not restore prior sessions or Recipient Access.</small></span></div>
      </div>

      {state.recoveryStep === 'restricted' ? (
        <button className="button button-primary button-full access-primary" type="button" onClick={replaceRecoveryPasskey} data-od-id="replace-recovery-passkey">
          Replace Passkey and invalidate prior access
        </button>
      ) : null}

      {state.recoveryStep === 'credentials-replaced' ? (
        <>
          <p className="access-notice" role="status"><Check aria-hidden="true" size={16} />Replacement Passkey registered. Prior sessions and unused Grants remain invalid.</p>
          <button className="button button-primary button-full access-primary" type="button" onClick={clearSecurityRestriction} data-od-id="clear-security-restriction">
            Clear account restriction
          </button>
        </>
      ) : null}

      {state.recoveryStep === 'cleared' ? (
        <>
          <p className="access-notice" role="status"><Check aria-hidden="true" size={16} />Restriction cleared. This recovery session is now closed.</p>
          <Link className="button button-primary button-full access-primary" to="/account-access/passkey/sign-in" data-od-id="recovery-new-passkey-sign-in">
            Sign in with the new Passkey
          </Link>
        </>
      ) : null}
    </AccessShell>
  );
}

function SensitiveActionReauthentication() {
  const navigate = useNavigate();
  const { state, completeSensitiveAction, cancelSensitiveAction } = usePrototypeState();
  const action = state.pendingSensitiveAction;

  if (!action) {
    return (
      <AccessShell
        eyebrow="Sensitive Action Grant"
        title="There is no saved action to confirm"
        description="The request may have expired, been cancelled, or already used its single-use Grant. Return safely and review the action again."
        dataOdId="sensitive-action-missing"
      >
        <Link className="button button-primary button-full access-primary" to="/app/deals">Return to Deals</Link>
      </AccessShell>
    );
  }

  const actionExpired = typeof action.requestedAt !== 'number' || Date.now() - action.requestedAt > 5 * 60 * 1000;
  if (actionExpired) {
    return (
      <AccessShell
        eyebrow="Sensitive Action Grant expired"
        title="This saved action expired"
        description="The five-minute fresh-authentication window closed before confirmation. No Grant was issued and no business state changed."
        dataOdId="sensitive-action-expired"
      >
        <button className="button button-primary button-full access-primary" type="button" onClick={() => { const returnPath = action.returnPath; cancelSensitiveAction(); navigate(returnPath); }} data-od-id="review-expired-sensitive-action">
          Review the action again
        </button>
      </AccessShell>
    );
  }

  return (
    <AccessShell
      eyebrow="Five-minute fresh authentication"
      title="Confirm this exact action with your Passkey"
      description="Passkey verification will issue one single-use Sensitive Action Grant for the saved command. This page exposes no Account, Deal, object, or Recipient payload."
      dataOdId="sensitive-action-reauthentication"
    >
      <div className="access-state-card" role="status" data-od-id="saved-sensitive-action">
        <KeyRound aria-hidden="true" size={21} />
        <div><strong>Saved sensitive action</strong><span>{action.safeReturnLabel}. The exact command, version, and idempotency key remain sealed until verification succeeds.</span></div>
      </div>
      <button
        className="button button-primary button-full access-primary"
        type="button"
        onClick={() => { const returnPath = action.returnPath; completeSensitiveAction(); navigate(returnPath); }}
        data-od-id="reauthenticate-sensitive-action"
      >
        Reauthenticate with Passkey
      </button>
      <button
        className="button button-secondary button-full access-primary"
        type="button"
        onClick={() => { const returnPath = action.returnPath; cancelSensitiveAction(); navigate(returnPath); }}
        data-od-id="cancel-sensitive-action"
      >
        Cancel without changing anything
      </button>
    </AccessShell>
  );
}

export function AccountAccessScreen({ mode = 'default' }: { mode?: AccountAccessMode }) {
  const navigate = useNavigate();
  const { state, startFirstAccess, registerPasskey, signInWithPasskey, startSecurityRecovery } = usePrototypeState();
  const [recoverySent, setRecoverySent] = useState(false);

  if (mode === 'recovery-restricted') return <RecoverySession />;
  if (mode === 'reauthenticate') return <SensitiveActionReauthentication />;

  if (mode === 'email-sent') {
    return (
      <AccessShell
        eyebrow="Mailbox verification"
        title="Check your email for the next step"
        description="If this address can continue, we sent the next step. The response does not reveal whether an account exists."
        dataOdId="account-access-email-sent"
        footer={<><Link className="text-link" to="/account-access">Use another email</Link><Link className="text-link" to="/account-access/passkey/sign-in">Use Passkey instead</Link></>}
      >
        <div className="access-state-card" role="status"><MailCheck aria-hidden="true" size={21} /><div><strong>Magic Link sent in this synthetic flow</strong><span>No Deal, object, or return-target payload appears in the message.</span></div></div>
        <Link className="button button-primary button-full access-primary" to="/account-access/verify-email" data-od-id="open-synthetic-magic-link">Open synthetic Magic Link</Link>
      </AccessShell>
    );
  }

  if (mode === 'verify-email') {
    return (
      <AccessShell
        eyebrow="First access"
        title="Verify your email to continue"
        description="This Magic Link confirms mailbox control only. It does not create an ordinary Banker Session or grant Account access."
        dataOdId="account-access-verify-email"
        footer={<Link className="text-link" to="/account-access">Return to account access</Link>}
      >
        <button className="button button-primary button-full access-primary" type="button" onClick={() => navigate('/account-access/passkey/register')} data-od-id="verify-synthetic-magic-link">
          Verify this synthetic Magic Link
        </button>
      </AccessShell>
    );
  }

  if (mode === 'passkey-register') {
    return (
      <AccessShell
        eyebrow="Required security setup"
        title="Create a Passkey before entering your account"
        description="A Passkey is required before the product opens Checkout, Account, or Deal content. V1 offers no password, numeric email code, TOTP, or MFA enrollment."
        dataOdId="account-access-passkey-registration"
        footer={<Link className="text-link" to="/account-access/recovery">I cannot create a Passkey</Link>}
      >
        <div className="access-state-card"><KeyRound aria-hidden="true" size={21} /><div><strong>Passkey required</strong><span>Bound to this device account and verified through the browser's native Passkey prompt.</span></div></div>
        <button className="button button-primary button-full access-primary" type="button" onClick={() => { registerPasskey(); navigate('/checkout/order'); }} data-od-id="register-passkey">
          Register Passkey and continue
        </button>
      </AccessShell>
    );
  }

  if (mode === 'passkey-sign-in') {
    return (
      <AccessShell
        eyebrow="Returning access"
        title="Sign in with your Passkey"
        description="Returning Account access uses a Passkey. Magic Link is reserved for the restricted recovery path."
        dataOdId="account-access-passkey-sign-in"
        footer={<Link className="text-link" to="/account-access/recovery">Recover without a usable Passkey</Link>}
      >
        <div className="access-state-card"><KeyRound aria-hidden="true" size={21} /><div><strong>{state.passkeyRegistered ? 'Passkey available' : 'No usable Passkey found'}</strong><span>One active Session per user · 12-hour inactivity · 7-day absolute lifetime.</span></div></div>
        <button className="button button-primary button-full access-primary" type="button" disabled={!state.passkeyRegistered} onClick={() => { signInWithPasskey(); navigate('/app/deals'); }} data-od-id="sign-in-with-passkey">
          Continue with Passkey
        </button>
      </AccessShell>
    );
  }

  if (mode === 'recovery') {
    return (
      <AccessShell
        eyebrow="Restricted recovery"
        title="Recover account access"
        description="Magic Link recovery can open only a content-free Security Recovery Session. It never opens Account or Deal content."
        dataOdId="account-access-recovery"
        footer={<Link className="text-link" to="/account-access/passkey/sign-in">Return to Passkey sign-in</Link>}
      >
        <form onSubmit={(event) => { event.preventDefault(); startSecurityRecovery(); setRecoverySent(true); }}>
          <label className="field"><span>Account email</span><input className="input" type="email" autoComplete="email" required placeholder="name@example.com" /></label>
          <button className="button button-primary button-full" type="submit" data-od-id="send-recovery-link">Send recovery link</button>
        </form>
        {recoverySent ? (
          <>
            <p className="access-notice" role="status"><MailCheck aria-hidden="true" size={16} />If this address can recover, we sent the next step.</p>
            <Link className="button button-secondary button-full access-primary" to="/account-access/recovery/restricted" data-od-id="open-restricted-recovery">Open restricted recovery session</Link>
          </>
        ) : null}
      </AccessShell>
    );
  }

  if (mode === 'expired') {
    return (
      <AccessShell
        eyebrow="Session ended"
        title="Your session ended before submission"
        description="Sign in again to return to the saved task. The Draft and authorized return target remain preserved without displaying protected payload here."
        dataOdId="account-access-session-expired"
        footer={<Link className="text-link" to="/account-access">Return to account access</Link>}
      >
        <Link className="button button-primary button-full access-primary" to="/account-access/passkey/sign-in">Sign in with Passkey</Link>
      </AccessShell>
    );
  }

  if (mode === 'denied') {
    return (
      <AccessShell
        eyebrow="Safe denial"
        title="This access cannot be completed"
        description="Verify the account used for this link or return to account access. No Account, Deal, or object existence is disclosed."
        dataOdId="account-access-denied"
        footer={<Link className="text-link" to="/account-access/recovery">Recover account access</Link>}
      >
        <Link className="button button-primary button-full access-primary" to="/account-access">Return to account access</Link>
      </AccessShell>
    );
  }

  return (
    <AccessShell
      eyebrow="Secure account gateway"
      title="Continue to account access"
      description="Enter an email address. The product determines the next safe step without asking you to choose create account or sign in first."
      dataOdId="account-access-screen"
      footer={<><Link className="text-link" to="/account-access/recovery">Recover access</Link><Link className="text-link" to="/account-access/passkey/sign-in">Sign in with Passkey</Link></>}
    >
      <form onSubmit={(event) => { event.preventDefault(); startFirstAccess(); navigate('/account-access/email-sent'); }}>
        <label className="field"><span>Email address</span><input className="input" type="email" autoComplete="email" required placeholder="name@example.com" /></label>
        <button className="button button-primary button-full" type="submit" data-od-id="continue-account-access">Continue</button>
      </form>
    </AccessShell>
  );
}
