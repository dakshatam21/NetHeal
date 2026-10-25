import { useNetwork } from '../../context/NetworkContext';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export function ForwardingTable() {
  const { forwardingTable, snapshot, destination, simulationState } = useNetwork();
  const { route } = snapshot;

  if (!route || forwardingTable.length === 0) {
    return (
      <div className="forwarding-empty">
        <p className="muted">Forwarding table will populate once a route is calculated or simulated.</p>
      </div>
    );
  }

  return (
    <div className="forwarding-table-wrap">
      <div className="forwarding-table-header">
        <span className="mono font-semibold">Router Next-Hop Decisions</span>
        <span className="tag tag--cyan">Target: {destination}</span>
      </div>

      <table className="forwarding-table">
        <thead>
          <tr>
            <th>Current Router</th>
            <th>Destination</th>
            <th>Next Hop</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {forwardingTable.map((entry) => {
            const isCurrent = entry.status === 'current' && simulationState === 'running';
            const isPassed = entry.status === 'passed';

            return (
              <tr
                key={`${entry.router}-${entry.nextHop}`}
                className={`forwarding-row ${isCurrent ? 'forwarding-row--active' : ''} ${
                  isPassed ? 'forwarding-row--passed' : ''
                }`}
              >
                <td>
                  <span className="router-badge router-badge--src">{entry.router}</span>
                </td>
                <td className="mono">{entry.destination}</td>
                <td>
                  <div className="next-hop-cell">
                    <ArrowRight size={13} className="text-cyan" />
                    <span className="router-badge router-badge--dst">{entry.nextHop}</span>
                  </div>
                </td>
                <td>
                  {isCurrent && (
                    <span className="hop-status hop-status--current">
                      <span className="pulsing-dot pulsing-dot--sm" /> Forwarding Now
                    </span>
                  )}
                  {isPassed && (
                    <span className="hop-status hop-status--passed">
                      <CheckCircle2 size={12} /> Traversed
                    </span>
                  )}
                  {entry.status === 'upcoming' && (
                    <span className="hop-status hop-status--upcoming">
                      <Clock size={12} /> Upcoming
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
