import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { dealBasePath } from './data/demoData';
import { RouterProvider } from './router';

describe('Project Northstar critical control loops', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('resolves a material conflict through Internal Controlled Export while keeping external authority separate', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/overview`}>
        <App />
      </RouterProvider>,
    );

    await user.click(screen.getByRole('link', { name: /Review material conflict/ }));
    expect(await screen.findByRole('heading', { name: 'Evidence & Decisions' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Prepare material control decision/ }));
    expect(await screen.findByRole('heading', { name: 'Record the material controlled treatment for Rev 0.3' })).toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: /Decision rationale/ }),
      'Use the Management Model QoE-adjusted definition as the controlled treatment for the current valuation purpose while preserving the Draft CIM seller Claim.',
    );
    await user.click(screen.getByRole('button', { name: 'Record treatment and Cash correction' }));

    expect(await screen.findByRole('heading', { name: 'Analysis' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Run deterministic validation' }));
    expect(await screen.findByText('$0.0m')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Inspect package readiness/ }));
    expect(await screen.findByRole('heading', { name: 'Review & Readiness' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Prepare Internal Controlled Export/ }));
    expect(await screen.findByRole('heading', { name: 'Create an Internal Controlled Export for Revision 0.4' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /I understand that this export does not authorize external circulation/ }));
    await user.click(screen.getByRole('button', { name: 'Create Internal Controlled Export' }));

    expect(await screen.findByRole('heading', { name: 'Confirm this exact action with your Passkey' })).toBeInTheDocument();
    expect(screen.getByText('Saved sensitive action')).toBeInTheDocument();
    expect(screen.queryByText('Analysis_Valuation_Workbook_Rev0.4.xlsx')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reauthenticate with Passkey' }));

    expect(await screen.findByRole('heading', { name: 'History & Portability' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Audit / Export' }));
    expect(await screen.findByText('Export EXP-021')).toBeInTheDocument();
    expect(screen.getByText('External-Use Decision')).toBeInTheDocument();
    expect(screen.getByText('Not recorded')).toBeInTheDocument();
  });

  it('filters Source Records and recovers from the empty-result state', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/sources`}>
        <App />
      </RouterProvider>,
    );

    const search = screen.getByRole('searchbox', { name: 'Search Source Records' });
    await user.type(search, 'nonexistent source');
    expect(await screen.findByRole('heading', { name: 'No matching results' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('Management_Model_v7.xlsx')).toBeInTheDocument();
  });

  it('binds material-review errors to the corresponding fields', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/evidence-decisions/control-review`}>
        <App />
      </RouterProvider>,
    );

    const challengedClaim = screen.getByRole('radio', { name: /\$18\.4m/ });
    const cashInput = screen.getByRole('textbox', { name: /Corrected Cash/ });
    const rationale = screen.getByRole('textbox', { name: /^Decision rationale/ });
    await user.click(challengedClaim);
    await user.clear(cashInput);
    await user.type(cashInput, '6.2');
    await user.type(rationale, 'Too short');
    await user.click(screen.getByRole('button', { name: 'Record treatment and Cash correction' }));

    expect(challengedClaim).toHaveAttribute('aria-invalid', 'true');
    expect(cashInput).toHaveAttribute('aria-invalid', 'true');
    expect(rationale).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert')).toHaveFocus();
  });

  it('shows a recoverable error state for an unknown workspace route', async () => {
    render(
      <RouterProvider initialPath={`${dealBasePath}/unknown-object`}>
        <App />
      </RouterProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'This workspace page does not exist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Deal Overview' })).toHaveAttribute('href', `${dealBasePath}/overview`);
  });

  it('shows a recoverable error state for an unknown public route', async () => {
    render(
      <RouterProvider initialPath="/unknown-product-page">
        <App />
      </RouterProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'This product page does not exist' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Product Overview' })).toHaveAttribute('href', '/');
  });

  it.each(['/index.html', '/app-shell.html'])('normalizes static entry route %s to the product overview', async (path) => {
    render(
      <RouterProvider initialPath={path}>
        <App />
      </RouterProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Run an auditable sell-side auction from source evidence to controlled Revision' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'This product page does not exist' })).not.toBeInTheDocument();
  });

  it('opens disclosure popovers with native controls and returns focus on Escape', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/overview`}>
        <App />
      </RouterProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Open notifications, one unread item' });
    await user.click(trigger);
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes small-screen work-area navigation with Escape and returns focus to its trigger', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/overview`}>
        <App />
      </RouterProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Work areas' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('requires Magic Link verification and Passkey registration before first Checkout access', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath="/account-access">
        <App />
      </RouterProvider>,
    );

    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'w.banker@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText(/If this address can continue, we sent the next step\./)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Open synthetic Magic Link' }));
    expect(await screen.findByRole('heading', { name: 'Verify your email to continue' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verify this synthetic Magic Link' }));
    expect(await screen.findByRole('heading', { name: 'Create a Passkey before entering your account' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Register Passkey and continue' }));

    expect(await screen.findByRole('heading', { name: 'Confirm Order' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continue to terms/ }));
    for (const checkbox of screen.getAllByRole('checkbox')) await user.click(checkbox);
    await user.click(screen.getByRole('button', { name: /Accept terms and continue to payment/ }));
    await user.click(screen.getByRole('button', { name: /Pay \$995/ }));
    expect(await screen.findByRole('heading', { name: 'Entitlement activated' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up the first Deal' })).toHaveAttribute('href', '/app/deals/new');
  });

  it('keeps Magic Link recovery inside a content-free Security Recovery Session', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath="/account-access/recovery">
        <App />
      </RouterProvider>,
    );

    await user.type(screen.getByRole('textbox', { name: 'Account email' }), 'w.banker@example.com');
    await user.click(screen.getByRole('button', { name: 'Send recovery link' }));
    await user.click(screen.getByRole('link', { name: 'Open restricted recovery session' }));

    expect(await screen.findByRole('heading', { name: 'Recover account security without opening Deal content' })).toBeInTheDocument();
    expect(screen.getByText('Security Recovery Session')).toBeInTheDocument();
    expect(screen.getByText('2 suspended access records')).toBeInTheDocument();
    expect(screen.queryByText('Project Northstar')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Replace Passkey and invalidate prior access' }));
    await user.click(screen.getByRole('button', { name: 'Clear account restriction' }));
    expect(await screen.findByRole('link', { name: 'Sign in with the new Passkey' })).toHaveAttribute('href', '/account-access/passkey/sign-in');
  });

  it('uses a single-use Passkey grant for external authority and exact Recipient Access', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/review-readiness/external-use-decisions/new`}>
        <App />
      </RouterProvider>,
    );

    await user.click(screen.getByRole('checkbox', { name: /I confirm conditional authorization/ }));
    await user.click(screen.getByRole('button', { name: 'Record conditional External-Use Decision' }));
    expect(await screen.findByRole('heading', { name: 'Confirm this exact action with your Passkey' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reauthenticate with Passkey' }));
    expect(await screen.findByText(/EUD-018 saved/)).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Create Recipient Access' }));
    await user.click(screen.getByRole('button', { name: 'Create exact Recipient Access' }));
    expect(await screen.findByRole('heading', { name: 'Confirm this exact action with your Passkey' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reauthenticate with Passkey' }));
    expect(await screen.findByText('Access created but not yet viewed.')).toBeInTheDocument();
  });

  it('requires reauthentication for Deal deletion but not ordinary archive', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <RouterProvider initialPath={`${dealBasePath}/controls/lifecycle`}>
        <App />
      </RouterProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Archive Project Northstar' }));
    expect(await screen.findByText('Deal archived; Active capacity released.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Confirm this exact action with your Passkey' })).not.toBeInTheDocument();
    unmount();

    render(
      <RouterProvider initialPath={`${dealBasePath}/controls/delete`}>
        <App />
      </RouterProvider>,
    );
    await user.type(screen.getByRole('textbox', { name: /Enter DELETE PROJECT NORTHSTAR/ }), 'DELETE PROJECT NORTHSTAR');
    await user.click(screen.getByRole('button', { name: 'Schedule controlled deletion' }));
    expect(await screen.findByRole('heading', { name: 'Confirm this exact action with your Passkey' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reauthenticate with Passkey' }));
    expect(await screen.findByRole('heading', { name: /Synthetic deletion Job DELJOB-004/ })).toBeInTheDocument();
  });

  it('matches Account security policy and gates Account export and deletion', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <RouterProvider initialPath="/app/account/security">
        <App />
      </RouterProvider>,
    );

    expect(await screen.findByText('Passkey · required')).toBeInTheDocument();
    expect(screen.getByText('Recovery only')).toBeInTheDocument();
    expect(screen.getByText(/12-hour inactivity/)).toBeInTheDocument();
    expect(screen.getByText(/7-day absolute/)).toBeInTheDocument();
    expect(screen.getAllByText('Current browser')).toHaveLength(1);
    unmount();

    render(
      <RouterProvider initialPath="/app/account/data">
        <App />
      </RouterProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Prepare Account index' }));
    expect(await screen.findByRole('heading', { name: 'Confirm this exact action with your Passkey' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reauthenticate with Passkey' }));
    expect(await screen.findByText('The Account index entered the synthetic preparation queue.')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Review Account deletion' }));
    await user.type(screen.getByRole('textbox', { name: /Enter DELETE ACCOUNT/ }), 'DELETE ACCOUNT');
    await user.click(screen.getByRole('button', { name: 'Schedule Account deletion' }));
    expect(await screen.findByRole('heading', { name: 'Confirm this exact action with your Passkey' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reauthenticate with Passkey' }));
    expect(await screen.findByRole('heading', { name: /Synthetic Account deletion Job ACCTDEL-004/ })).toBeInTheDocument();
  });

  it('cancels a saved sensitive action without mutation and safely handles a missing action', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <RouterProvider initialPath={`${dealBasePath}/review-readiness/external-use-decisions/new`}>
        <App />
      </RouterProvider>,
    );

    await user.click(screen.getByRole('checkbox', { name: /I confirm conditional authorization/ }));
    await user.click(screen.getByRole('button', { name: 'Record conditional External-Use Decision' }));
    await user.click(screen.getByRole('button', { name: 'Cancel without changing anything' }));
    expect(await screen.findByRole('heading', { name: 'Review the exact external-use scope for Revision 0.4' })).toBeInTheDocument();
    expect(screen.queryByText(/EUD-018 saved/)).not.toBeInTheDocument();
    unmount();

    render(
      <RouterProvider initialPath="/account-access/reauthenticate">
        <App />
      </RouterProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'There is no saved action to confirm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Deals' })).toHaveAttribute('href', '/app/deals');
  });

  it('rejects an expired five-minute Sensitive Action Grant request', async () => {
    window.localStorage.setItem('controlled-auction-workspace-demo-state', JSON.stringify({
      pendingSensitiveAction: {
        code: 'deal-deletion',
        returnPath: `${dealBasePath}/controls/delete`,
        safeReturnLabel: 'Return to the Deal deletion receipt',
        commandDigest: 'sha256:expired',
        resourceVersion: '0.4',
        idempotencyKey: 'expired-action',
        requestedAt: Date.now() - (6 * 60 * 1000),
      },
    }));

    render(
      <RouterProvider initialPath="/account-access/reauthenticate">
        <App />
      </RouterProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'This saved action expired' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reauthenticate with Passkey' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review the action again' })).toBeInTheDocument();
  });

  it('enters a navigation-isolated exact Revision Viewer after Recipient Access verification', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath="/recipient-access/ra-018">
        <App />
      </RouterProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Verify exact access' }));
    await user.click(screen.getByRole('link', { name: /Enter secure Viewer/ }));
    expect(await screen.findByRole('heading', { name: 'Project Northstar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exact access boundary' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Deal work domains' })).not.toBeInTheDocument();
  });

  it('provides clear selected state, panel relationships, and keyboard switching for object detail tabs', async () => {
    const user = userEvent.setup();
    render(
      <RouterProvider initialPath={`${dealBasePath}/source-records/sr-002`}>
        <App />
      </RouterProvider>,
    );

    const overviewTab = screen.getByRole('tab', { name: 'Overview' });
    const nativeStructureTab = screen.getByRole('tab', { name: 'Native Structure' });
    overviewTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(nativeStructureTab).toHaveFocus();
    expect(nativeStructureTab).toHaveAttribute('aria-selected', 'true');
    expect(nativeStructureTab).toHaveAttribute('aria-controls', 'source-object-panel');
    expect(screen.getByRole('tabpanel', { name: 'Native Structure content' })).toHaveAttribute('id', 'source-object-panel');
  });

  it.each([
    ['/', 'Run an auditable sell-side auction from source evidence to controlled Revision'],
    ['/pricing', 'One named Banker, two billing terms with the same capability'],
    ['/app/deals', 'Deals'],
    ['/app/account/data', 'Data, Export & Deletion'],
    [`${dealBasePath}/controls/preflight`, 'Lock rights, capability, and Output Ceiling before processing real material'],
    [`${dealBasePath}/sources/add`, 'Create an inspectable Source Record before controlled processing'],
    [`${dealBasePath}/source-records/sr-002`, 'Management_Model_v7.xlsx'],
    [`${dealBasePath}/auction-process/bids/compare`, 'Separate original bids, normalized views, and Banker judgment'],
    [`${dealBasePath}/deliverables/del-004`, 'Confidential Information Memorandum'],
    [`${dealBasePath}/review-readiness/qc-findings/qc-022`, 'CIM Reader Copy page 18 does not match the Native Artifact'],
    [`${dealBasePath}/review-readiness/external-use-decisions/new`, 'Review the exact external-use scope for Revision 0.4'],
    [`${dealBasePath}/controls/delete`, 'Delete customer-visible Deal data for Project Northstar'],
  ])('opens formal route %s directly', async (path, heading) => {
    render(
      <RouterProvider initialPath={path}>
        <App />
      </RouterProvider>,
    );
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
