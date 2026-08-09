import type { ReactNode } from 'react';
import { useLocation } from './router';
import { dealBasePath } from './data/demoData';
import { InspectorProvider } from './hooks/useInspector';
import { PrototypeProvider } from './hooks/usePrototypeState';
import { AccountShell } from './layouts/AccountShell';
import { PublicShell } from './layouts/PublicShell';
import { RecipientShell } from './layouts/RecipientShell';
import { WorkspaceShell } from './layouts/WorkspaceShell';
import { AccountUtilityScreen, DealsScreen, UsagePlanScreen } from './screens/AccountScreens';
import { AccountAccessScreen } from './screens/AccountAccessScreens';
import { ActionsScreen } from './screens/ActionsScreen';
import { AnalysisScreen } from './screens/AnalysisScreen';
import { AuctionScreen } from './screens/AuctionScreen';
import { BidComparisonScreen, BuyerDetailScreen, DeliverableDetailScreen, RevisionComparisonScreen, StageTransitionScreen, TemplatesScreen } from './screens/AuctionAndPackageDetailScreens';
import { DecisionReviewScreen } from './screens/DecisionReviewScreen';
import { EvidenceScreen } from './screens/EvidenceScreen';
import { ExportReviewScreen } from './screens/ExportReviewScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { PackageScreen } from './screens/PackageScreen';
import { CheckoutScreen, MechanismScreen, NorthstarProofScreen, OutcomeScreen, PricingScreen, QualificationScreen } from './screens/PublicScreens';
import { ReadinessScreen } from './screens/ReadinessScreen';
import { RecipientAccessScreen, RecipientUnavailableScreen, RecipientViewerScreen } from './screens/RecipientScreens';
import { ArchivePackageScreen, DeletionScreen, DeletionStatusScreen, ExternalUseDecisionScreen, ExternalUseEventScreen, ImpactAssessmentScreen, LifecycleScreen, PackageReadinessDetailScreen, QCFindingScreen, RecipientAccessCreationScreen } from './screens/ReviewAndLifecycleScreens';
import { DealSetupScreen, FirstDealGuideScreen, PreflightScreen } from './screens/SetupScreens';
import { AddSourceScreen, JobDetailScreen, ObjectDetailScreen, SourcePacketScreen } from './screens/SourceAndObjectScreens';
import { SourcesScreen } from './screens/SourcesScreen';

export default function App() {
  const { pathname } = useLocation();
  const browserRoute = pathname.split(/[?#]/)[0];
  const route = /\/(?:index|app-shell)\.html$/.test(browserRoute) ? '/' : browserRoute;
  const workspaceScreens: Record<string, ReactNode> = {
    [`${dealBasePath}/setup`]: <DealSetupScreen existing />,
    [`${dealBasePath}/controls/preflight`]: <PreflightScreen />,
    [`${dealBasePath}/guide`]: <FirstDealGuideScreen />,
    [`${dealBasePath}/guide/completion`]: <FirstDealGuideScreen completed />,
    [`${dealBasePath}/overview`]: <OverviewScreen />,
    [`${dealBasePath}/actions`]: <ActionsScreen />,
    [`${dealBasePath}/actions/jobs/job-0098`]: <JobDetailScreen />,
    [`${dealBasePath}/sources`]: <SourcesScreen />,
    [`${dealBasePath}/sources/add`]: <AddSourceScreen />,
    [`${dealBasePath}/source-records/sr-002`]: <ObjectDetailScreen kind="source" />,
    [`${dealBasePath}/source-packets/sp-004`]: <SourcePacketScreen />,
    [`${dealBasePath}/evidence-decisions`]: <EvidenceScreen />,
    [`${dealBasePath}/evidence-decisions/control-review`]: <DecisionReviewScreen />,
    [`${dealBasePath}/claims/clm-018`]: <ObjectDetailScreen kind="claim" />,
    [`${dealBasePath}/analysis`]: <AnalysisScreen />,
    [`${dealBasePath}/analysis/analyses/anl-014`]: <ObjectDetailScreen kind="analysis" />,
    [`${dealBasePath}/auction-process`]: <AuctionScreen />,
    [`${dealBasePath}/auction-process/buyers/buyer-07`]: <BuyerDetailScreen />,
    [`${dealBasePath}/auction-process/bids/compare`]: <BidComparisonScreen />,
    [`${dealBasePath}/auction-process/stage-transition`]: <StageTransitionScreen />,
    [`${dealBasePath}/execution-package`]: <PackageScreen />,
    [`${dealBasePath}/execution-package/templates`]: <TemplatesScreen />,
    [`${dealBasePath}/deliverables/del-004`]: <DeliverableDetailScreen />,
    [`${dealBasePath}/deliverables/del-004/revisions/compare`]: <RevisionComparisonScreen />,
    [`${dealBasePath}/deliverables/del-004/revisions/0.4/parity`]: <RevisionComparisonScreen mode="parity" />,
    [`${dealBasePath}/review-readiness`]: <ReadinessScreen />,
    [`${dealBasePath}/review-readiness/qc-findings/qc-022`]: <QCFindingScreen />,
    [`${dealBasePath}/review-readiness/impact-assessments/ia-014`]: <ImpactAssessmentScreen />,
    [`${dealBasePath}/review-readiness/package-readiness`]: <PackageReadinessDetailScreen />,
    [`${dealBasePath}/review-readiness/external-use-decisions/new`]: <ExternalUseDecisionScreen />,
    [`${dealBasePath}/review-readiness/external-use-decisions/eud-018`]: <ExternalUseDecisionScreen existing />,
    [`${dealBasePath}/review-readiness/recipient-access/new`]: <RecipientAccessCreationScreen />,
    [`${dealBasePath}/history-portability`]: <HistoryScreen />,
    [`${dealBasePath}/history-portability/internal-export`]: <ExportReviewScreen />,
    [`${dealBasePath}/history-portability/reimports/ri-004`]: <RevisionComparisonScreen mode="reimport" />,
    [`${dealBasePath}/history-portability/external-use-events/new`]: <ExternalUseEventScreen />,
    [`${dealBasePath}/history-portability/archive-packages/new`]: <ArchivePackageScreen />,
    [`${dealBasePath}/controls/lifecycle`]: <LifecycleScreen />,
    [`${dealBasePath}/controls/delete`]: <DeletionScreen />,
  };

  const accountScreens: Record<string, ReactNode> = {
    '/app/deals': <DealsScreen />,
    '/app/deals/new': <DealSetupScreen />,
    '/app/account/usage-plan': <UsagePlanScreen />,
    '/app/account/usage-plan/cancellation': <UsagePlanScreen cancellation />,
    '/app/account/billing': <AccountUtilityScreen kind="billing" />,
    '/app/account/notifications': <AccountUtilityScreen kind="notifications" />,
    '/app/account/security': <AccountUtilityScreen kind="security" />,
    '/app/account/data': <AccountUtilityScreen kind="data" />,
    '/app/account/data/delete-account': <DeletionScreen scope="account" />,
    '/app/account/help': <AccountUtilityScreen kind="help" />,
  };

  const publicScreens: Record<string, ReactNode> = {
    '/': <OutcomeScreen />,
    '/project-northstar': <NorthstarProofScreen />,
    '/pricing': <PricingScreen />,
    '/qualification': <QualificationScreen />,
  };

  const accessScreens: Record<string, ReactNode> = {
    '/account-access': <AccountAccessScreen />,
    '/account-access/email-sent': <AccountAccessScreen mode="email-sent" />,
    '/account-access/verify-email': <AccountAccessScreen mode="verify-email" />,
    '/account-access/passkey/register': <AccountAccessScreen mode="passkey-register" />,
    '/account-access/passkey/sign-in': <AccountAccessScreen mode="passkey-sign-in" />,
    '/account-access/reauthenticate': <AccountAccessScreen mode="reauthenticate" />,
    '/account-access/recovery': <AccountAccessScreen mode="recovery" />,
    '/account-access/recovery/restricted': <AccountAccessScreen mode="recovery-restricted" />,
    '/account-access/session-expired': <AccountAccessScreen mode="expired" />,
    '/account-access/denied': <AccountAccessScreen mode="denied" />,
    '/checkout/order': <CheckoutScreen step="order" />,
    '/checkout/terms': <CheckoutScreen step="terms" />,
    '/checkout/payment': <CheckoutScreen step="payment" />,
    '/checkout/confirmation': <CheckoutScreen step="confirmation" />,
    '/checkout/recovery': <CheckoutScreen step="recovery" />,
  };

  const recipientScreens: Record<string, ReactNode> = {
    '/recipient-access/ra-018': <RecipientAccessScreen />,
    '/recipient-access/ra-018/viewer': <RecipientViewerScreen />,
    '/recipient-access/ra-018/unavailable': <RecipientUnavailableScreen />,
  };

  const deletionStatusScreens: Record<string, ReactNode> = {
    '/deletion-status/deljob-004': <DeletionStatusScreen scope="deal" />,
    '/deletion-status/acctdel-004': <DeletionStatusScreen scope="account" />,
  };

  const isMechanism = route.startsWith('/how-it-works/') || route.startsWith('/security-data/') || route.startsWith('/resources/') || route.startsWith('/triggers/');
  const workspaceScreen = workspaceScreens[route];
  const accountScreen = accountScreens[route];
  const publicScreen = publicScreens[route] ?? (isMechanism ? <MechanismScreen /> : undefined);
  const accessScreen = accessScreens[route];
  const recipientScreen = recipientScreens[route];
  const deletionStatusScreen = deletionStatusScreens[route];

  let currentScreen: ReactNode;
  if (workspaceScreen) currentScreen = <WorkspaceShell>{workspaceScreen}</WorkspaceShell>;
  else if (accountScreen) currentScreen = <AccountShell>{accountScreen}</AccountShell>;
  else if (publicScreen) currentScreen = <PublicShell>{publicScreen}</PublicShell>;
  else if (accessScreen) currentScreen = accessScreen;
  else if (recipientScreen) currentScreen = <RecipientShell>{recipientScreen}</RecipientShell>;
  else if (deletionStatusScreen) currentScreen = deletionStatusScreen;
  else currentScreen = route.startsWith('/app/') ? <WorkspaceShell><NotFoundScreen /></WorkspaceShell> : <PublicShell><NotFoundScreen scope="public" /></PublicShell>;

  return (
    <PrototypeProvider>
      <InspectorProvider>
        {currentScreen}
      </InspectorProvider>
    </PrototypeProvider>
  );
}
