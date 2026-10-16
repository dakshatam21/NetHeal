import { CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { useNetwork } from '../../context/NetworkContext';

export function FailureList() {
  const { topology, failures, restoreRouter, restoreLink } = useNetwork();

  if (failures.routers.length + failures.links.length === 0) {
    return (
      <EmptyState icon={<CheckCircle2 size={20} />} title="No active failures" message="All routers and links are operational." />
    );
  }

  return (
    <ul className="failure-list">
      {failures.routers.map((id) => (
        <li key={`r-${id}`}>
          <span className="tag tag--bad">ROUTER</span>
          <span className="mono failure-list__name">{id}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => restoreRouter(id)} aria-label={`Restore router ${id}`}>
            Restore
          </button>
        </li>
      ))}
      {failures.links.map((id) => {
        const link = topology.links.find((l) => l.id === id);
        return (
          <li key={`l-${id}`}>
            <span className="tag tag--bad">LINK</span>
            <span className="mono failure-list__name">
              {id}
              {link ? ` (${link.source}–${link.target})` : ''}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => restoreLink(id)} aria-label={`Restore link ${id}`}>
              Restore
            </button>
          </li>
        );
      })}
    </ul>
  );
}
