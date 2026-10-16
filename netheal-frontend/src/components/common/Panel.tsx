import type { ReactNode } from 'react';

interface Props {
  title: string;
  tag?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, tag, icon, footer, className, children }: Props) {
  return (
    <section className={`panel ${className ?? ''}`.trim()}>
      <header className="panel__header">
        <h2 className="panel__title">
          {icon}
          {title}
        </h2>
        {tag && <span className="tag">{tag}</span>}
      </header>
      <div className="panel__body">{children}</div>
      {footer && <footer className="panel__footer">{footer}</footer>}
    </section>
  );
}
