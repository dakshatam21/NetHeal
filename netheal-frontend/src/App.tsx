import { useState } from 'react';
import { NetworkProvider } from './context/NetworkContext';
import { AppLayout } from './components/layout/AppLayout';
import { OverviewPage } from './pages/OverviewPage';
import { TopologyPage } from './pages/TopologyPage';
import { FailureSimulatorPage } from './pages/FailureSimulatorPage';
import { RouteAnalysisPage } from './pages/RouteAnalysisPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import type { PageId } from './types/network';

function renderPage(page: PageId) {
  switch (page) {
    case 'overview':
      return <OverviewPage />;
    case 'topology':
      return <TopologyPage />;
    case 'simulator':
      return <FailureSimulatorPage />;
    case 'analysis':
      return <RouteAnalysisPage />;
    case 'analytics':
      return <AnalyticsPage />;
  }
}

export default function App() {
  const [page, setPage] = useState<PageId>('overview');

  return (
    <NetworkProvider>
      <AppLayout page={page} onNavigate={setPage}>
        {renderPage(page)}
      </AppLayout>
    </NetworkProvider>
  );
}
