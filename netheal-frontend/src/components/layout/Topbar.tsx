import { useState } from 'react';
import { Activity, Clock, Menu, RotateCcw } from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge';
import type { BadgeStatus } from '../common/StatusBadge';
import { useNetwork } from '../../context/NetworkContext';

interface Props {
  title: string;
  description: string;
  onMenuClick: () => void;
}

export function Topbar({ title, description, onMenuClick }: Props) {
  const { snapshot, failures, lastUpdated, resetSimulation } = useNetwork();
  const [confirming, setConfirming] = useState(false);

  const failedTotal = failures.routers.length + failures.links.length;
  const health: { status: BadgeStatus; label: string } =
    snapshot.status === 'unreachable'
      ? { status: 'failed', label: 'Network critical' }
      : failedTotal > 0
        ? { status: 'degraded', label: 'Network degraded' }
        : { status: 'healthy', label: 'Network nominal' };

  const handleConfirm = () => {
    resetSimulation();
    setConfirming(false);
  };

  return (
    <header className="topbar">
      <button type="button" className="btn btn--ghost btn--icon topbar__menu" onClick={onMenuClick} aria-label="Open navigation">
        <Menu size={18} />
      </button>

      <div className="topbar__title">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="topbar__meta">
        <StatusBadge status="simulation" label="Simulation" />
        <span className="topbar__health">
          <Activity size={14} />
          <StatusBadge status={health.status} label={health.label} />
        </span>
        <span className="topbar__clock mono" title="Time of the last simulation change">
          <Clock size={12} /> Updated {lastUpdated.toLocaleTimeString('en-GB')}
        </span>

        {confirming ? (
          <span className="topbar__confirm" role="alertdialog" aria-label="Confirm reset">
            <span className="label">Reset all?</span>
            <button type="button" className="btn btn--danger btn--sm" onClick={handleConfirm}>
              Confirm
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(true)}>
            <RotateCcw size={14} /> Reset Simulation
          </button>
        )}
      </div>
    </header>
  );
}
