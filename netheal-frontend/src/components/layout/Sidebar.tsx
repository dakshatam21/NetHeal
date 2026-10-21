import { BarChart3, LayoutDashboard, Network, Route, Share2, X, ZapOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PageId } from '../../types/network';

export interface NavItem {
  id: PageId;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', title: 'Network Overview', description: 'Health, routing and events for the simulated network', icon: LayoutDashboard },
  { id: 'topology', label: 'Network Topology', title: 'Network Topology', description: 'Interactive router graph, route endpoints and router details', icon: Share2 },
  { id: 'simulator', label: 'Failure Simulator', title: 'Failure Simulator', description: 'Fail and restore routers or links and watch routes recalculate', icon: ZapOff },
  { id: 'analysis', label: 'Route Analysis', title: 'Route Analysis', description: 'Baseline route, alternatives and the future ML-assisted comparison', icon: Route },
  { id: 'analytics', label: 'Performance Analytics', title: 'Performance Analytics', description: 'Simulated trends and route comparison charts', icon: BarChart3 },
];

interface Props {
  page: PageId;
  open: boolean;
  onNavigate: (page: PageId) => void;
  onClose: () => void;
}

export function Sidebar({ page, open, onNavigate, onClose }: Props) {
  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Network size={18} />
        </div>
        <div>
          <div className="sidebar__name">NetHeal</div>
          <div className="sidebar__sub">SELF-HEALING NETWORK SIMULATOR</div>
        </div>
        <button type="button" className="sidebar__close" onClick={onClose} aria-label="Close navigation">
          <X size={16} />
        </button>
      </div>

      <nav className="nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.id === page;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav__item${active ? ' nav__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
