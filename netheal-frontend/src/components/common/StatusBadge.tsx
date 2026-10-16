import type { ComponentStatus, RouteStatus } from '../../types/network';

export type BadgeStatus = ComponentStatus | RouteStatus | 'info' | 'muted' | 'simulation';

const TONES: Record<BadgeStatus, string> = {
  healthy: 'ok',
  optimal: 'ok',
  degraded: 'warn',
  rerouted: 'warn',
  failed: 'bad',
  unreachable: 'bad',
  info: 'info',
  simulation: 'info',
  muted: 'muted',
};

interface Props {
  status: BadgeStatus;
  label?: string;
}

export function StatusBadge({ status, label }: Props) {
  return <span className={`badge badge--${TONES[status]}`}>{label ?? status}</span>;
}
