import { AlertTriangle, CheckCircle2, CircleMinus, CircleX, Info } from 'lucide-react';
import type { StatusTone } from '../types/domain';

interface StatusBadgeProps {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}

const icons = {
  neutral: CircleMinus,
  info: Info,
  warning: AlertTriangle,
  critical: CircleX,
  success: CheckCircle2,
};

export function StatusBadge({ tone = 'neutral', children, className = '' }: StatusBadgeProps) {
  const Icon = icons[tone];
  return (
    <span className={`status-badge status-${tone} ${className}`.trim()}>
      <Icon aria-hidden="true" size={13} strokeWidth={1.9} />
      <span>{children}</span>
    </span>
  );
}
