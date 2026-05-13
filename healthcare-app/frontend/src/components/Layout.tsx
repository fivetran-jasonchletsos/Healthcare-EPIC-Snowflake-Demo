import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, getSnapshotTime, subscribeSource, type DataSource } from '../api/queries';
import { getTheme, setTheme, subscribeTheme, type Theme } from '../theme';
import * as watchlist from '../watchlist';

const NAV_ITEMS: [string, string][] = [
  ['/', 'Home'],
  ['/patients', 'Patients'],
  ['/dashboard', 'Dashboard'],
  ['/map', 'Map'],
  ['/agent', 'Ask AI'],
  ['/pipeline', 'Pipeline'],
  ['/about', 'About'],
];

export default function Layout() {
  const [source, setSource] = useState<DataSource>('demo');
  const [snapshotAt, setSnapshotAt] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [watchCount, setWatchCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsub = subscribeSource(setSource);
    api.getSummary().finally(() => setSnapshotAt(getSnapshotTime())).catch(() => {});
    const tsub = subscribeTheme(setThemeState);
    const wsub = watchlist.subscribe((ids) => setWatchCount(ids.length));
    return () => { unsub(); tsub(); wsub(); };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/patients?q=${encodeURIComponent(q)}` : '/patients');
    setMobileOpen(false);
  };

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-brand-800 text-white shadow-sm sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-brand-500 flex items-center justify-center font-bold text-sm">
                EC
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-semibold text-sm sm:text-base truncate">Epic Clarity</div>
                <div className="text-[10px] sm:text-xs text-brand-200">Snowflake Demo</div>
              </div>
            </Link>

            <form onSubmit={onSubmit} className="hidden md:flex flex-1 max-w-xl">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, MRN, ZIP..."
                className="flex-1 rounded-l-md border-0 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-brand-300"
              />
              <button
                type="submit"
                aria-label="Search"
                className="inline-flex items-center justify-center rounded-r-md bg-brand-600 hover:bg-brand-500 px-3 border border-brand-600"
              >
                <SearchIcon className="h-4 w-4" />
              </button>
            </form>

            <nav className="hidden lg:flex items-center gap-1 text-sm">
              {NAV_ITEMS.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-brand-700' : 'hover:bg-brand-700/60'}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/watchlist')}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-brand-700/70"
                aria-label="Watchlist"
                title="Watchlist"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill={watchCount > 0 ? '#fbbf24' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                {watchCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 inline-flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-900">
                    {watchCount}
                  </span>
                )}
              </button>
              <ThemeToggle theme={theme} onChange={setTheme} />
              <SourceBadge source={source} snapshotAt={snapshotAt} />
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-brand-700/70"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden pb-3 border-t border-brand-700/40 pt-3 space-y-3">
              <form onSubmit={onSubmit} className="md:hidden flex">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, MRN..."
                  className="flex-1 rounded-l-md border-0 px-3 py-2 text-sm text-slate-900"
                />
                <button type="submit" aria-label="Search" className="rounded-r-md bg-brand-600 hover:bg-brand-500 px-3 inline-flex items-center justify-center">
                  <SearchIcon className="h-4 w-4" />
                </button>
              </form>
              <nav className="grid grid-cols-2 gap-1 text-sm">
                {NAV_ITEMS.map(([to, label]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-center ${isActive ? 'bg-brand-700' : 'bg-brand-700/30 hover:bg-brand-700/60'}`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 text-xs sm:text-sm text-slate-500 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div>
            Data flow: <strong className="text-slate-700">SQL Server → Fivetran → Snowflake → dbt → JSON snapshot</strong>
          </div>
          <div>© 2026 Healthcare EPIC Snowflake Demo · Synthetic data</div>
        </div>
      </footer>
    </div>
  );
}

function SourceBadge({ source, snapshotAt: _snapshotAt }: { source: DataSource; snapshotAt: string | null }) {
  const live = source === 'live';
  return (
    <div
      title={live ? 'Live Snowflake snapshot' : 'Demo data — load real data via scripts/build_snapshot.py'}
      className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        live ? 'bg-emerald-500/20 text-emerald-100' : 'bg-amber-500/20 text-amber-100'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-300'} animate-pulse`} />
      {live ? 'Snowflake · live' : 'Demo'}
    </div>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="hidden md:inline-flex items-center gap-0.5 rounded-full bg-white/10 p-0.5 text-[11px] font-medium">
      {(['fivetran', 'snowflake'] as Theme[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            theme === t ? 'bg-white text-brand-800 shadow' : 'text-white/80 hover:text-white'
          }`}
          title={`${t === 'fivetran' ? 'Fivetran' : 'Snowflake'} theme`}
        >
          {t === 'fivetran' ? 'Fivetran' : 'Snowflake'}
        </button>
      ))}
    </div>
  );
}

function SearchIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
