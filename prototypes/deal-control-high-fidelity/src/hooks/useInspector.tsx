import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { InspectorRecord } from '../types/domain';

interface InspectorContextValue {
  record: InspectorRecord | null;
  openInspector: (record: InspectorRecord) => void;
  closeInspector: () => void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: PropsWithChildren) {
  const [record, setRecord] = useState<InspectorRecord | null>(null);
  const value = useMemo(
    () => ({ record, openInspector: setRecord, closeInspector: () => setRecord(null) }),
    [record],
  );
  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector() {
  const value = useContext(InspectorContext);
  if (!value) {
    throw new Error('useInspector must be used inside InspectorProvider');
  }
  return value;
}
