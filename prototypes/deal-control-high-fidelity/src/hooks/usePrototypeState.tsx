import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { PendingSensitiveAction, PrototypeState } from '../types/domain';

const STORAGE_KEY = 'controlled-auction-workspace-demo-state';

const initialState: PrototypeState = {
  decisionRecorded: false,
  cashCorrected: false,
  validationPassed: false,
  exportCreated: false,
  externalUseDecisionRecorded: false,
  recipientAccessCreated: false,
  accountDataExportRequested: false,
  dealDeletionRequested: false,
  accountDeletionRequested: false,
  passkeyRegistered: true,
  accountSessionActive: true,
  accountSecurityRestricted: false,
  recoveryStep: 'restricted',
  pendingSensitiveAction: null,
  lastSensitiveActionCode: null,
  decisionRationale: '',
  currentRevision: '0.3',
  lastUpdated: '2026-08-04 15:00',
};

interface PrototypeContextValue {
  state: PrototypeState;
  recordDecision: (rationale: string) => void;
  runValidation: () => void;
  startFirstAccess: () => void;
  registerPasskey: () => void;
  signInWithPasskey: () => void;
  startSecurityRecovery: () => void;
  replaceRecoveryPasskey: () => void;
  clearSecurityRestriction: () => void;
  requestSensitiveAction: (action: Omit<PendingSensitiveAction, 'requestedAt'>) => void;
  completeSensitiveAction: () => void;
  cancelSensitiveAction: () => void;
  resetDemo: () => void;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

function readStoredState(): PrototypeState {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? { ...initialState, ...JSON.parse(value) } : initialState;
  } catch {
    return initialState;
  }
}

export function PrototypeProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PrototypeState>(readStoredState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sandboxed previews may deny storage; interaction remains available in memory.
    }
  }, [state]);

  const value = useMemo<PrototypeContextValue>(
    () => ({
      state,
      recordDecision: (rationale) => {
        setState((current) => ({
          ...current,
          decisionRecorded: true,
          cashCorrected: true,
          decisionRationale: rationale,
          lastUpdated: '2026-08-04 15:12',
        }));
      },
      runValidation: () => {
        setState((current) => ({
          ...current,
          validationPassed: true,
          currentRevision: '0.4',
          lastUpdated: '2026-08-04 15:16',
        }));
      },
      startFirstAccess: () => {
        setState((current) => ({
          ...current,
          passkeyRegistered: false,
          accountSessionActive: false,
        }));
      },
      registerPasskey: () => {
        setState((current) => ({
          ...current,
          passkeyRegistered: true,
          accountSessionActive: true,
        }));
      },
      signInWithPasskey: () => {
        setState((current) => ({
          ...current,
          passkeyRegistered: true,
          accountSessionActive: true,
          accountSecurityRestricted: false,
        }));
      },
      startSecurityRecovery: () => {
        setState((current) => ({
          ...current,
          accountSessionActive: false,
          accountSecurityRestricted: true,
          recoveryStep: 'restricted',
        }));
      },
      replaceRecoveryPasskey: () => {
        setState((current) => ({
          ...current,
          passkeyRegistered: true,
          recoveryStep: 'credentials-replaced',
        }));
      },
      clearSecurityRestriction: () => {
        setState((current) => ({
          ...current,
          accountSessionActive: false,
          accountSecurityRestricted: false,
          recoveryStep: 'cleared',
        }));
      },
      requestSensitiveAction: (action) => {
        setState((current) => ({
          ...current,
          pendingSensitiveAction: { ...action, requestedAt: Date.now() },
          lastSensitiveActionCode: null,
        }));
      },
      completeSensitiveAction: () => {
        setState((current) => {
          const action = current.pendingSensitiveAction;
          if (!action) return current;
          return {
            ...current,
            exportCreated: current.exportCreated || action.code === 'internal-controlled-export',
            externalUseDecisionRecorded: current.externalUseDecisionRecorded || action.code === 'external-use-decision',
            recipientAccessCreated: current.recipientAccessCreated || action.code === 'recipient-access',
            accountDataExportRequested: current.accountDataExportRequested || action.code === 'account-data-export',
            dealDeletionRequested: current.dealDeletionRequested || action.code === 'deal-deletion',
            accountDeletionRequested: current.accountDeletionRequested || action.code === 'account-deletion',
            pendingSensitiveAction: null,
            lastSensitiveActionCode: action.code,
            lastUpdated: '2026-08-04 15:21',
          };
        });
      },
      cancelSensitiveAction: () => {
        setState((current) => ({ ...current, pendingSensitiveAction: null }));
      },
      resetDemo: () => setState(initialState),
    }),
    [state],
  );

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototypeState() {
  const value = useContext(PrototypeContext);
  if (!value) {
    throw new Error('usePrototypeState must be used inside PrototypeProvider');
  }
  return value;
}
