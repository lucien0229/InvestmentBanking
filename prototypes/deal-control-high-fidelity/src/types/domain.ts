import type { LucideIcon } from 'lucide-react';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'critical' | 'success';

export interface NavigationItem {
  label: string;
  shortLabel: string;
  path: string;
  icon: LucideIcon;
  dataOdId: string;
}

export interface SourceRecord {
  id: string;
  fileName: string;
  kind: string;
  version: string;
  locator: string;
  reliance: string;
  relianceTone: StatusTone;
  coverage: string;
  updated: string;
}

export interface DeliverableRecord {
  id: string;
  name: string;
  format: string;
  applicability: string;
  applicabilityTone: StatusTone;
  revision: string;
  readiness: string;
  readinessTone: StatusTone;
  readerCopy: string;
}

export interface PrototypeState {
  decisionRecorded: boolean;
  cashCorrected: boolean;
  validationPassed: boolean;
  exportCreated: boolean;
  externalUseDecisionRecorded: boolean;
  recipientAccessCreated: boolean;
  accountDataExportRequested: boolean;
  dealDeletionRequested: boolean;
  accountDeletionRequested: boolean;
  passkeyRegistered: boolean;
  accountSessionActive: boolean;
  accountSecurityRestricted: boolean;
  recoveryStep: 'restricted' | 'credentials-replaced' | 'cleared';
  pendingSensitiveAction: PendingSensitiveAction | null;
  lastSensitiveActionCode: SensitiveActionCode | null;
  decisionRationale: string;
  currentRevision: '0.3' | '0.4';
  lastUpdated: string;
}

export type SensitiveActionCode =
  | 'account-data-export'
  | 'internal-controlled-export'
  | 'external-use-decision'
  | 'recipient-access'
  | 'deal-deletion'
  | 'account-deletion';

export interface PendingSensitiveAction {
  code: SensitiveActionCode;
  returnPath: string;
  safeReturnLabel: string;
  commandDigest: string;
  resourceVersion: string;
  idempotencyKey: string;
  requestedAt: number;
}

export interface InspectorRecord {
  eyebrow: string;
  title: string;
  description: string;
  metadata: Array<{ label: string; value: string }>;
  href?: string;
  linkLabel?: string;
}
