import { useState } from 'react';
import type { ReactNode } from 'react';
import { NAV_ITEMS, Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastStack } from '../common/Toast';
import { useNetwork } from '../../context/NetworkContext';
import type { PageId } from '../../types/network';

interface Props {
  page: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function AppLayout({ page, onNavigate, children }: Props) {
  const { toasts, dismissToast } = useNetwork();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => item.id === page) ?? NAV_ITEMS[0];

  const handleNavigate = (next: PageId) => {
    onNavigate(next);
    setMenuOpen(false);
  };

  return (
    <div className="app">
      <Sidebar page={page} open={menuOpen} onNavigate={handleNavigate} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="app__backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className="app__main">
        <Topbar title={current.title} description={current.description} onMenuClick={() => setMenuOpen(true)} />
        <main className="content">{children}</main>
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
