const ITEMS: { className: string; label: string }[] = [
  { className: 'legend__node legend__node--healthy', label: 'Healthy router' },
  { className: 'legend__node legend__node--degraded', label: 'Degraded router' },
  { className: 'legend__node legend__node--failed', label: 'Failed router' },
  { className: 'legend__node legend__node--selected', label: 'Selected router' },
  { className: 'legend__line legend__line--route', label: 'Active route' },
  { className: 'legend__line legend__line--normal', label: 'Normal link' },
  { className: 'legend__line legend__line--failed', label: 'Failed link' },
  { className: 'legend__line legend__line--degraded', label: 'Unusable link' },
];

export function NetworkLegend() {
  return (
    <ul className="legend" aria-label="Graph legend">
      {ITEMS.map((item) => (
        <li key={item.label}>
          <span className={item.className} aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
