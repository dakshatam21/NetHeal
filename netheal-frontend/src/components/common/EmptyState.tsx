import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  message: string;
  children?: ReactNode;
}

export function EmptyState({ icon, title, message, children }: Props) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__message">{message}</p>
      {children}
    </div>
  );
}
