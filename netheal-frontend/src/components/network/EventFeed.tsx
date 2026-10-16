import { ScrollText } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';
import { useNetwork } from '../../context/NetworkContext';

export function EventFeed({ limit = 10 }: { limit?: number }) {
  const { events } = useNetwork();
  const shown = events.slice(0, limit);

  if (shown.length === 0) {
    return <EmptyState icon={<ScrollText size={20} />} title="No events yet" message="Simulation events will appear here." />;
  }

  return (
    <ol className="event-feed" aria-live="polite">
      {shown.map((e) => (
        <li key={e.id} className={`event event--${e.level}`}>
          <span className="event__time mono">{e.time}</span>
          <span className="event__dot" aria-hidden="true" />
          <span className="event__msg">{e.message}</span>
        </li>
      ))}
    </ol>
  );
}
