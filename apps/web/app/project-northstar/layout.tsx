import type { ReactNode } from "react";
import { PublicShell } from "../../components/deal-control/ui";

export default function NorthstarLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
