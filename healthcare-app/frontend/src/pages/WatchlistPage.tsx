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
        <div className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-medium uppercase tracking-wider mb-3">
          ★ Watchlist
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Saved patients</h1>
        <p className="text-sm text-slate-500 mt-1">
          {ids.length === 0
            ? "You haven't saved any patients yet."
            : `${ids.length} ${ids.length === 1 ? 'patient' : 'patients'} saved in this browser.`}
        </p>
      </header>

      {ids.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center">
          <div className="text-slate-700 font-medium">Nothing here yet.</div>
          <p className="text-sm text-slate-500 mt-1">
            Open any patient and click <strong>"Add to watchlist"</strong> in the header.
          </p>
          <Link to="/patients" className="mt-4 inline-block rounded-md bg-brand-700 hover:bg-brand-800 text-white text-sm font-medium px-4 py-2">
            Browse patients
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(({ id, p }) => (
            <Link
              key={id}
              to={`/patients/${encodeURIComponent(id)}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-brand-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-xs font-mono text-slate-500 truncate">MRN {p.med_rec_num}</div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); watchlist.remove(id); }}
                  className="text-xs text-slate-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </div>
              <div className="font-semibold text-slate-900">{p.full_name}</div>
              <div className="text-sm text-slate-500">{p.age} y/o · {p.sex} · {p.city ?? '—'}</div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-bold text-brand-700">{formatNumber(p.encounter_count)} visits</span>
                {p.active_chronic_count > 0 && (
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-rose-50 text-rose-700">
                    {p.active_chronic_count} chronic
                  </span>
                )}
              </div>
              <div className="mt-1 text-xs text-slate-400">{formatCurrency(p.total_charges)} lifetime</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
