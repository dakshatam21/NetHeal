import { Server } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { useNetwork } from '../../context/NetworkContext';
import { getLinkStatus, getRouterStatus } from '../../services/routingService';

export function RouterDetails() {
  const { topology, failures, selectedRouterId, source, destination, snapshot, failRouter, restoreRouter, setSource, setDestination } =
    useNetwork();

  const router = topology.routers.find((r) => r.id === selectedRouterId);
  if (!router) {
    return (
      <EmptyState icon={<Server size={20} />} title="No router selected" message="Click a router on the graph to inspect it." />
    );
  }

  const status = getRouterStatus(router.id, topology, failures);
  const failed = status === 'failed';
  const attached = topology.links.filter((l) => l.source === router.id || l.target === router.id);
  const onRoute = snapshot.route?.path.includes(router.id) ?? false;
  const routeRole =
    router.id === source ? 'Source' : router.id === destination ? 'Destination' : onRoute ? 'On active route' : 'Not on route';

  return (
    <div className="details">
      <div className="details__head">
        <span className="details__id mono">{router.id}</span>
        <StatusBadge status={status} />
      </div>
      <dl className="kv">
        <dt>IP address</dt>
        <dd className="mono">{router.ip}</dd>
        <dt>Role</dt>
        <dd>{router.role}</dd>
        <dt>Route role</dt>
        <dd>{routeRole}</dd>
      </dl>

      <div className="label details__sub">Attached links</div>
      <ul className="mini-list">
        {attached.map((l) => {
          const peer = l.source === router.id ? l.target : l.source;
          return (
            <li key={l.id}>
              <span className="mono">
                {l.id} → {peer}
              </span>
              <span className="mono muted">{l.latencyMs} ms</span>
              <StatusBadge status={getLinkStatus(l, failures)} />
            </li>
          );
        })}
      </ul>

      <div className="btn-row">
        {failed ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => restoreRouter(router.id)}>
            Restore router
          </button>
        ) : (
          <button type="button" className="btn btn--danger btn--sm" onClick={() => failRouter(router.id)}>
            Fail router
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" disabled={router.id === source} onClick={() => setSource(router.id)}>
          Set as source
        </button>
        <button type="button" className="btn btn--ghost btn--sm" disabled={router.id === destination} onClick={() => setDestination(router.id)}>
          Set as destination
        </button>
      </div>
    </div>
  );
}
