import type { ReactNode } from 'react';

export type Tone = 'ok' | 'warn' | 'bad' | 'info';

interface Props {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
}

export function MetricCard({ label, value, unit, hint, icon, tone = 'info' }: Props) {
  return (
    <div className={`metric metric--${tone}`}>
      <div className="metric__head">
        <span className="label">{label}</span>
        {icon}
      </div>
      <div className="metric__value">
        {value}
        {unit && <span className="metric__unit">{unit}</span>}
      </div>
      {hint && <div className="metric__hint">{hint}</div>}
    </div>
  );
}
