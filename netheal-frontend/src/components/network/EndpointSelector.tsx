import { ArrowLeftRight } from 'lucide-react';
import { useNetwork } from '../../context/NetworkContext';

export function EndpointSelector({ idPrefix }: { idPrefix: string }) {
  const { topology, failures, source, destination, setSource, setDestination } = useNetwork();

  const options = topology.routers.map((r) => (
    <option key={r.id} value={r.id}>
      {r.id} — {r.ip}
      {failures.routers.includes(r.id) ? ' (FAILED)' : ''}
    </option>
  ));

  return (
    <div className="endpoint">
      <div className="field">
        <label className="label" htmlFor={`${idPrefix}-source`}>
          Source
        </label>
        <select id={`${idPrefix}-source`} className="select mono" value={source} onChange={(e) => setSource(e.target.value)}>
          {options}
        </select>
      </div>
      <button type="button" className="btn btn--ghost btn--icon" onClick={() => setSource(destination)} aria-label="Swap source and destination">
        <ArrowLeftRight size={16} />
      </button>
      <div className="field">
        <label className="label" htmlFor={`${idPrefix}-destination`}>
          Destination
        </label>
        <select
          id={`${idPrefix}-destination`}
          className="select mono"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        >
          {options}
        </select>
      </div>
    </div>
  );
}
