import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, formatNumber } from '../api/queries';
import * as watchlist from '../watchlist';
import type { PatientSearchResult } from '../types';

export default function WatchlistPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [patients, setPatients] = useState<Record<string, PatientSearchResult>>({});

  useEffect(() => watchlist.subscribe(setIds), []);

  useEffect(() => {
    let cancelled = false;
    api.searchPatients({ limit: 200000 }).then((r) => {
      if (cancelled) return;
      const m: Record<string, PatientSearchResult> = {};
      for (const p of r.results) m[p.pat_id] = p;
      setPatients(m);
    });
    return () => { cancelled = true; };
  }, []);

  const items = ids.map((id) => ({ id, p: patients[id] })).filter((x) => x.p);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="eyebrow mb-1">Saved</div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">Watchlist</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1">
          {ids.length === 0
            ? "You haven't saved any patients yet."
            : `${ids.length} ${ids.length === 1 ? 'patient' : 'patients'} saved in this browser.`}
        </p>
      </header>

      {ids.length === 0 ? (
        <div className="clinical-card p-10 text-center border-dashed">
          <div className="font-serif text-lg font-semibold text-[var(--ink-strong)]">Nothing here yet.</div>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Open any patient and click <strong>"Add to watchlist"</strong> in the header.
          </p>
          <Link
            to="/patients"
            className="mt-4 inline-block rounded-md text-white text-sm font-semibold px-4 py-2"
            style={{ background: 'var(--color-brand-700)' }}
          >
            Browse patients
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ id, p }) => {
            const burden = p.active_chronic_count;
            const burdenTone =
              burden >= 3 ? { cls: 'alert', label: 'High burden' } :
              burden >= 1 ? { cls: 'caution', label: `${burden} chronic` } :
              { cls: 'healthy', label: 'Stable' };
            return (
              <Link
                key={id}
                to={`/patients/${encodeURIComponent(id)}`}
                className="block clinical-card hover:border-[var(--clinical-teal)] transition-colors group"
              >
                <div className="px-5 pt-4 pb-3 border-b border-[var(--hairline-soft)] flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-[var(--ink-soft)] tracking-tight truncate">MRN {p.med_rec_num}</div>
                    <div className="mt-1 font-serif font-semibold text-[var(--ink-strong)] truncate group-hover:underline underline-offset-2">
                      {p.full_name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); watchlist.remove(id); }}
                    className="text-xs text-[var(--ink-soft)] hover:text-[var(--clinical-rose)] shrink-0"
                    aria-label="Remove from watchlist"
                  >
                    ✕
                  </button>
                </div>
                <div className="px-5 py-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-[var(--ink-muted)] tabular">
                    {p.age} y/o · {p.sex} · {p.city ?? '—'}
                  </div>
                  <span className={`status-pill ${burdenTone.cls}`}>{burdenTone.label}</span>
                </div>
                <div className="px-5 pb-4 flex items-baseline justify-between">
                  <span className="font-serif text-xl font-semibold text-[var(--ink-strong)] tabular">
                    {formatNumber(p.encounter_count)}
                    <span className="ml-1 text-xs font-sans font-medium text-[var(--ink-soft)]">visits</span>
                  </span>
                  <span className="text-xs text-[var(--ink-soft)] tabular">{formatCurrency(p.total_charges)} lifetime</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
