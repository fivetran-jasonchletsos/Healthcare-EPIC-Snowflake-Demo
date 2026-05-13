import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api, getSnapshotTime, subscribeSource, type DataSource } from '../api/queries';
import { getTheme, setTheme, subscribeTheme, type Theme } from '../theme';
import * as watchlist from '../watchlist';

const NAV_ITEMS: [string, string][] = [
  ['/', 'Home'],
  ['/patients', 'Patients'],
  ['/dashboard', 'Population Health'],
  ['/map', 'Geographic'],
  ['/agent', 'Clinical Insights'],
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
    <div className="min-h-full flex flex-col bg-[var(--paper)]">
      <div className="institutional-rail" />

      <header className="bg-white border-b border-[var(--hairline)] sticky top-0 z-30 backdrop-blur-sm bg-white/95">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-6">
            <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0 group">
              <div className="h-10 w-10 rounded-md flex items-center justify-center shadow-sm" style={{ background: 'var(--institutional-accent)' }}>
                <CaduceusMark className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-serif font-semibold text-lg sm:text-xl text-[var(--ink-strong)] tracking-tight truncate">
                  Epic Clarity
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium text-[var(--ink-soft)] uppercase tracking-[0.14em]">
                  Clinical Analytics Platform
                </div>
              </div>
            </Link>

            <form onSubmit={onSubmit} className="hidden md:flex flex-1 max-w-md relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-[var(--ink-soft)] pointer-events-none">
                <SearchIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search patient by name, MRN, or city…"
                className="flex-1 rounded-md bg-[var(--paper-deep)] border border-[var(--hairline)] pl-9 pr-3 py-2 text-sm placeholder:text-[var(--ink-soft)] focus:bg-white focus:border-[var(--clinical-teal)] focus:outline-none"
              />
            </form>

            <nav className="hidden lg:flex items-center gap-0.5 text-sm">
              {NAV_ITEMS.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `relative px-3 py-2 font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--ink-strong)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-strong)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {isActive && (
                        <span className="absolute left-3 right-3 -bottom-[1px] h-[2px] rounded-full" style={{ background: 'var(--color-brand-600)' }} />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => navigate('/watchlist')}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--ink-muted)] hover:text-[var(--ink-strong)] hover:bg-[var(--paper-deep)]"
                aria-label="Watchlist"
                title="Watchlist"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill={watchCount > 0 ? '#f59e0b' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
                  <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                {watchCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 inline-flex items-center justify-center rounded-full bg-[var(--clinical-amber)] text-[10px] font-bold text-white">
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
                className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-[var(--paper-deep)]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  {mobileOpen ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden pb-4 border-t border-[var(--hairline-soft)] pt-3 space-y-3">
              <form onSubmit={onSubmit} className="md:hidden flex relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-[var(--ink-soft)]">
                  <SearchIcon className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search patient…"
                  className="flex-1 rounded-md bg-[var(--paper-deep)] border border-[var(--hairline)] pl-9 pr-3 py-2 text-sm"
                />
              </form>
              <nav className="grid grid-cols-2 gap-1 text-sm">
                {NAV_ITEMS.map(([to, label]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-center font-medium border ${
                        isActive
                          ? 'bg-[var(--paper-deep)] text-[var(--ink-strong)] border-[var(--clinical-teal)]'
                          : 'border-[var(--hairline)] text-[var(--ink-muted)] hover:bg-[var(--paper-deep)]'
                      }`
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

      <footer className="border-t border-[var(--hairline)] bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-xs sm:text-sm text-[var(--ink-muted)] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="font-serif font-semibold text-[var(--ink-strong)] mb-1.5">Epic Clarity · Analytics</div>
            <p className="leading-relaxed text-[var(--ink-soft)]">
              A reference architecture for clinical analytics on Epic Clarity-shaped data, built on the modern
              data stack. Synthetic data — not for clinical use.
            </p>
          </div>
          <div>
            <div className="eyebrow mb-2">Data Pipeline</div>
            <p className="leading-relaxed">
              SQL Server CDC → Fivetran → Snowflake → dbt → static JSON snapshot
            </p>
          </div>
          <div>
            <div className="eyebrow mb-2">Compliance Posture</div>
            <p className="leading-relaxed">
              Synthetic data only · No PHI · HIPAA-aligned design patterns · Snowflake access history audit
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--hairline-soft)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 text-[11px] text-[var(--ink-soft)] flex flex-col sm:flex-row gap-1 sm:items-center sm:justify-between">
            <div>© 2026 Healthcare EPIC Snowflake Demo · For demonstration only</div>
            <div>Snapshot generated {snapshotAt ? new Date(snapshotAt).toLocaleString() : '—'}</div>
          </div>
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
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border ${
        live
          ? 'bg-[var(--clinical-green-bg)] text-[var(--clinical-green)] border-emerald-200'
          : 'bg-[var(--clinical-amber-bg)] text-[var(--clinical-amber)] border-amber-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[var(--clinical-green)]' : 'bg-[var(--clinical-amber)]'} animate-pulse`} />
      {live ? 'Snowflake · live' : 'Demo'}
    </div>
  );
}

function ThemeToggle({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  return (
    <div className="hidden md:inline-flex items-center rounded-md border border-[var(--hairline)] bg-white p-0.5 text-[11px] font-medium">
      {(['fivetran', 'snowflake'] as Theme[]).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-2.5 py-1 rounded transition-colors ${
            theme === t
              ? 'bg-[var(--paper-deep)] text-[var(--ink-strong)]'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
          title={`${t === 'fivetran' ? 'Fivetran' : 'Snowflake'} accent`}
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

function CaduceusMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3v18" />
      <path d="M8 6c0 2 4 3 4 3s4-1 4-3" />
      <path d="M8 10c0 2 4 3 4 3s4-1 4-3" />
      <path d="M8 14c0 2 4 3 4 3s4-1 4-3" />
      <path d="M9 4l3-1 3 1" />
    </svg>
  );
}
