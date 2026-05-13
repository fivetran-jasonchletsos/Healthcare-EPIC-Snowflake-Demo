import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatNumber } from '../api/queries';
import type { SummaryStats, PatientSearchResult } from '../types';

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [recent, setRecent] = useState<PatientSearchResult[]>([]);

  useEffect(() => {
    api.getSummary().then(setStats).catch(() => {});
    api
      .searchPatients({ limit: 6 })
      .then((r) => setRecent(r.results.slice(0, 6)))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Title strip */}
      <section className="bg-gradient-to-r from-teal-700 to-teal-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight whitespace-nowrap">
              Epic Clarity in plain English.
            </h1>
            <span className="hidden md:inline text-xs text-teal-200">
              SQL Server → Fivetran → Snowflake → dbt → React
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
            <InlineStat label="Patients" value={stats ? formatNumber(stats.total_patients) : '—'} />
            <InlineStat label="Encounters" value={stats ? formatNumber(stats.total_encounters) : '—'} />
            <InlineStat label="Avg charge" value={stats ? formatCurrency(stats.avg_encounter_cost) : '—'} />
            <button
              onClick={() => navigate('/pipeline')}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 px-2.5 py-1 text-[11px] font-medium"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Pipeline Live
            </button>
          </div>
        </div>
      </section>

      {/* Two hero tiles */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <FindPatientSpotlight onGo={(q) => navigate(q ? `/patients?q=${encodeURIComponent(q)}` : '/patients')} />
          <AgentSpotlight onAsk={(q) => navigate(`/agent?q=${encodeURIComponent(q)}`)} onOpen={() => navigate('/agent')} onAbout={() => navigate('/about-agent')} />
        </div>
      </section>

      {/* Featured patients */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Recent patient cohort</h2>
            <p className="text-sm text-slate-500">A snapshot of patients with recent encounters in the marts layer.</p>
          </div>
          <button onClick={() => navigate('/patients')} className="text-sm font-medium text-teal-700 hover:text-teal-900">
            View all patients →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recent.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse h-32" />
              ))
            : recent.map((p) => (
                <button
                  key={p.pat_id}
                  onClick={() => navigate(`/patients/${encodeURIComponent(p.pat_id)}`)}
                  className="text-left rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-teal-300 transition-all"
                >
                  <div className="text-xs text-slate-500 font-mono">MRN {p.med_rec_num}</div>
                  <div className="mt-2 font-semibold text-slate-900">{p.full_name}</div>
                  <div className="text-sm text-slate-500">
                    {p.age} y/o · {p.sex} · {p.city ?? '—'}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <div className="text-lg font-bold text-teal-700">
                      {formatNumber(p.encounter_count)} <span className="text-xs font-normal text-slate-500">visits</span>
                    </div>
                    {p.active_chronic_count > 0 && (
                      <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-rose-50 text-rose-700">
                        {p.active_chronic_count} chronic
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">PCP: {p.primary_care_provider ?? '—'}</div>
                </button>
              ))}
        </div>
      </section>

      {/* Modern data stack ribbon */}
      <section className="bg-white border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Built on a modern data stack</h2>
          <p className="text-slate-500 mb-8">Every number on this page traces back through governed, observable infrastructure.</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '1', name: 'Fivetran', desc: 'CDC connector mirrors Epic Clarity from SQL Server.', color: 'from-sky-500 to-sky-700' },
              { step: '2', name: 'Snowflake', desc: 'Lands raw CDC + hosts staging / intermediate / marts.', color: 'from-cyan-500 to-cyan-700' },
              { step: '3', name: 'dbt', desc: 'Tested transformations produce clinical + financial marts.', color: 'from-orange-500 to-orange-700' },
              { step: '4', name: 'React + Recharts', desc: 'Static SPA reads daily JSON exports of the marts.', color: 'from-teal-500 to-teal-700' },
            ].map((s) => (
              <div key={s.name} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${s.color}`} />
                <div className="p-5">
                  <div className="text-xs font-mono text-slate-400">STEP {s.step}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{s.name}</div>
                  <div className="mt-2 text-sm text-slate-500">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-wider text-teal-200 font-medium">{label}</div>
      <div className="text-sm sm:text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function FindPatientSpotlight({ onGo }: { onGo: (q: string) => void }) {
  const [q, setQ] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onGo(q.trim());
  };
  const samples = ['Smith', 'MRN 100042', '15217', 'Pittsburgh', 'Diabetes'];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-600 to-teal-800 text-white shadow-xl h-full flex flex-col">
      <div className="relative p-6 sm:p-7 flex flex-col gap-5 flex-1">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium uppercase tracking-wider">
          🩺 Find Patient
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight">Look up any patient record</h2>
          <p className="mt-2 text-sm sm:text-base text-teal-100">
            Name, MRN, ZIP, or condition. Returns encounter history, diagnoses, account balance, and care-team comparables.
          </p>
        </div>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="John Smith · MRN 100042 · 15217"
            className="flex-1 min-w-0 rounded-md border-0 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 shadow-lg focus:outline-2 focus:outline-amber-300"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 hover:bg-amber-400 px-5 py-3 text-base font-semibold text-slate-900 shadow-lg shadow-amber-500/30 transition-all hover:shadow-amber-500/50 whitespace-nowrap"
          >
            Search <span aria-hidden>→</span>
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-auto">
          <span className="text-xs text-teal-200 self-center mr-1">Try:</span>
          {samples.map((s) => (
            <button
              key={s}
              onClick={() => onGo(s)}
              className="text-xs sm:text-sm rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm px-3 py-1.5 transition-colors border border-white/15"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentSpotlight({ onAsk, onOpen, onAbout }: { onAsk: (q: string) => void; onOpen: () => void; onAbout: () => void }) {
  const samples = [
    'Top diagnoses by encounter count',
    'Patients with 3+ chronic conditions',
    'Average length of stay by department',
    'Outstanding balances over $5K',
  ];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 text-white shadow-xl h-full flex flex-col">
      <div className="relative p-6 sm:p-7 flex flex-col gap-5 flex-1">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium uppercase tracking-wider">
          <span aria-hidden>✨</span> Clinical Insight Agent
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight">Ask in plain English</h2>
          <p className="mt-2 text-sm sm:text-base text-violet-100">
            Skip the BI tool. Type a question — patients, encounters, diagnoses, financials — and get back a table or chart instantly.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {samples.map((s) => (
            <button
              key={s}
              onClick={() => onAsk(s)}
              className="group/chip text-left text-sm sm:text-base rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-3 transition-colors border border-white/15 flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="text-violet-200">✨</span>
                <span>{s}</span>
              </span>
              <span aria-hidden className="text-violet-200 group-hover/chip:translate-x-0.5 transition-transform">→</span>
            </button>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-3 flex-wrap">
          <button
            onClick={onOpen}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-white text-violet-700 px-5 py-3 text-base font-semibold shadow-lg hover:bg-violet-50 transition-colors"
          >
            Open the agent <span aria-hidden>→</span>
          </button>
          <button onClick={onAbout} className="inline-flex items-center gap-1.5 text-sm text-violet-100 hover:text-white font-medium underline-offset-4 hover:underline">
            How it works <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
