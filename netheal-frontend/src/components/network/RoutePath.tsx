import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';

interface Props {
  path: string[] | null;
}

export function RoutePath({ path }: Props) {
  if (!path || path.length === 0) {
    return <span className="route-path route-path--none">DESTINATION UNREACHABLE</span>;
  }
  return (
    <span className="route-path">
      {path.map((id, i) => (
        <Fragment key={`${id}-${i}`}>
          <span className="route-chip">{id}</span>
          {i < path.length - 1 && <ChevronRight size={12} className="route-path__sep" />}
        </Fragment>
      ))}
    </span>
  );
}
