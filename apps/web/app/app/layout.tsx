import type { ReactNode } from "react";
import { WorkspaceShell } from "../../components/deal-control/ui";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
