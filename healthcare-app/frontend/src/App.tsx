import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import PatientsPage from './pages/PatientsPage';
import PatientDetailPage from './pages/PatientDetailPage';
import DashboardPage from './pages/DashboardPage';
import AgentPage from './pages/AgentPage';
import AboutAgentPage from './pages/AboutAgentPage';
import PipelinePage from './pages/PipelinePage';
import ExecutivePage from './pages/ExecutivePage';
import MapPage from './pages/MapPage';
import WatchlistPage from './pages/WatchlistPage';
import AboutPage from './pages/AboutPage';
import NotFoundPage from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/patients" element={<PatientsPage />} />
            <Route path="/patients/:patId" element={<PatientDetailPage />} />
            <Route path="/executive" element={<ExecutivePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/about-agent" element={<AboutAgentPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
