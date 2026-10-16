import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EventLevel, ToastMessage } from '../../types/network';

const ICONS: Record<EventLevel, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

interface ItemProps {
  toast: ToastMessage;
  onDismiss: (id: number) => void;
}

function ToastItem({ toast, onDismiss }: ItemProps) {
  const Icon = ICONS[toast.level];

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 4000);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className={`toast toast--${toast.level}`} role="status">
      <Icon size={16} className="toast__icon" />
      <span className="toast__msg">{toast.message}</span>
      <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  );
}

interface StackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: StackProps) {
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
