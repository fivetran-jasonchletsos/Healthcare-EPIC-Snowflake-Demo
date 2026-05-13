import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatCurrencyShort, formatNumber } from '../api/queries';
import type { PatientSearchResult } from '../types';
import { KPISkeleton, LoadingBanner, PanelSkeleton } from '../components/Skeleton';

const TOOLTIP_STYLE = {
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  padding: '8px 10px',
} as const;
const ACCENT = '#1d4ed8';

interface Filter {
  ageBucket?: { label: string; lo: number; hi: number };
  chronicBucket?: { label: string; lo: number; hi: number };
  city?: string;
}

const AGE_BUCKETS = [
  { label: '0–17', lo: 0, hi: 18 },
  { label: '18–34', lo: 18, hi: 35 },
  { label: '35–54', lo: 35, hi: 55 },
  { label: '55–64', lo: 55, hi: 65 },
  { label: '65–79', lo: 65, hi: 80 },
  { label: '80+', lo: 80, hi: 200 },
];

const CHRONIC_BUCKETS = [
  { label: '0', lo: 0, hi: 1 },
  { label: '1', lo: 1, hi: 2 },
  { label: '2', lo: 2, hi: 3 },
  { label: '3', lo: 3, hi: 4 },
  { label: '4', lo: 4, hi: 5 },
  { label: '5+', lo: 5, hi: 99 },
];

// Clinical palette for chronic burden ramp — evidence-medicine green → rose.
const CHRONIC_RAMP = ['#047857', '#65a30d', '#b45309', '#d97706', '#be123c', '#9f1239'];

export default function DashboardPage() {
  const [all, setAll] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({});
  const navigate = useNavigate();

  useEffect(() => {
    api.searchPatients({ limit: 200000 }).then((r) => setAll(r.results)).finally(() => setLoading(false));
  }, []);

  const patients = useMemo(() => {
    let rows = all;
    if (filter.ageBucket) rows = rows.filter((p) => p.age >= filter.ageBucket!.lo && p.age < filter.ageBucket!.hi);
    if (filter.chronicBucket)
      rows = rows.filter((p) => p.active_chronic_count >= filter.chronicBucket!.lo && p.active_chronic_count < filter.chronicBucket!.hi);
    if (filter.city) rows = rows.filter((p) => p.city === filter.city);
    return rows;
  }, [all, filter]);

  const filterCount = Object.values(filter).filter(Boolean).length;
  const filtered = filterCount > 0;

  const ageData = useMemo(() => AGE_BUCKETS.map((b) => ({
    ...b,
    count: patients.filter((p) => p.age >= b.lo && p.age < b.hi).length,
  })), [patients]);

  const chronicData = useMemo(() => CHRONIC_BUCKETS.map((b) => ({
    ...b,
    count: patients.filter((p) => p.active_chronic_count >= b.lo && p.active_chronic_count < b.hi).length,
  })), [patients]);

  const byCity = useMemo(() => {
    const m = new Map<string, PatientSearchResult[]>();
    for (const p of patients) {
      const c = p.city ?? 'Unknown';
      const list = m.get(c) ?? [];
      list.push(p);
      m.set(c, list);
    }
    return Array.from(m.entries())
      .map(([city, rows]) => ({
        city,
        count: rows.length,
        encounters: rows.reduce((s, r) => s + r.encounter_count, 0),
        charges: rows.reduce((s, r) => s + r.total_charges, 0),
        chronic: rows.reduce((s, r) => s + r.active_chronic_count, 0),
      }))
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6 max-w-3xl">
          <div className="eyebrow mb-1">Population Analytics</div>
          <h1 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">Clinical population overview</h1>
          <p className="text-sm text-[var(--ink-muted)] mt-2">Loading patient snapshot…</p>
          <div className="mt-3">
            <LoadingBanner label="Downloading patients.json" detail="One-time fetch · cached for the rest of the session" />
          </div>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} primary={i === 2} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanelSkeleton title="Age distribution" />
          <PanelSkeleton title="Chronic burden" />
          <PanelSkeleton title="Top cities" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 max-w-3xl">
        <div className="eyebrow mb-1">Population Analytics</div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">Clinical population overview</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-2">
          Aggregations across the gold-layer marts in Snowflake. All numbers computed in your browser from the published snapshot.
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-[var(--clinical-amber-bg)] border border-amber-200 px-3 py-1.5 text-xs text-[var(--clinical-amber)]">
          <span aria-hidden>→</span>
          <span><strong>Interactive:</strong> click any bar or row to cross-filter every chart, KPI, and table.</span>
        </div>
      </header>

      {filtered && (
        <div className="mb-6 rounded-md border border-[var(--clinical-teal)] bg-[var(--clinical-teal-bg)] px-4 py-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[var(--clinical-teal)] font-semibold mr-1">Filtered:</span>
          {filter.ageBucket && <Chip label={`Age ${filter.ageBucket.label}`} onClear={() => setFilter((p) => ({ ...p, ageBucket: undefined }))} />}
          {filter.chronicBucket && <Chip label={`Chronic ${filter.chronicBucket.label}`} onClear={() => setFilter((p) => ({ ...p, chronicBucket: undefined }))} />}
          {filter.city && <Chip label={`City ${filter.city}`} onClear={() => setFilter((p) => ({ ...p, city: undefined }))} />}
          <span className="text-xs text-[var(--clinical-teal)] ml-1 tabular">Showing {formatNumber(patients.length)} of {formatNumber(all.length)}</span>
          <button onClick={() => setFilter({})} className="ml-auto text-xs font-medium text-[var(--clinical-teal)] hover:text-[var(--ink-strong)]">
            Clear all
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI label="Patients" value={formatNumber(patients.length)} />
        <KPI label="Encounters" value={formatNumber(patients.reduce((s, p) => s + p.encounter_count, 0))} />
        <KPI label="Active chronic dx" value={formatNumber(patients.reduce((s, p) => s + p.active_chronic_count, 0))} primary />
        <KPI label="Total charges" value={formatCurrency(patients.reduce((s, p) => s + p.total_charges, 0))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Age distribution" subtitle="Click a bar to filter the dashboard">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} patients`, '']} separator="" />
                <Bar
                  dataKey="count"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={48}
                  cursor="pointer"
                  onClick={(d: any) => setFilter((prev) => ({ ...prev, ageBucket: prev.ageBucket?.label === d.label ? undefined : d }))}
                >
                  {ageData.map((b, i) => {
                    const sel = filter.ageBucket?.label === b.label;
                    const dim = filter.ageBucket && !sel;
                    return <Cell key={i} fill={sel ? '#0e7490' : ACCENT} opacity={dim ? 0.3 : 1} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Chronic-condition burden" subtitle="Click a bar to filter by chronic count">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chronicData}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} patients`, '']} separator="" />
                <Bar
                  dataKey="count"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={48}
                  cursor="pointer"
                  onClick={(d: any) => setFilter((prev) => ({ ...prev, chronicBucket: prev.chronicBucket?.label === d.label ? undefined : d }))}
                >
                  {chronicData.map((b, i) => {
                    const sel = filter.chronicBucket?.label === b.label;
                    const dim = filter.chronicBucket && !sel;
                    return <Cell key={i} fill={sel ? '#0b1220' : CHRONIC_RAMP[i]} opacity={dim ? 0.3 : 1} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top cities by patient count" subtitle="Click a row to filter the dashboard" className="lg:col-span-2">
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-sm tabular">
              <thead className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="px-3 py-2 text-left font-medium">City</th>
                  <th className="px-3 py-2 text-right font-medium">Patients</th>
                  <th className="px-3 py-2 text-left font-medium w-[28%]">Share</th>
                  <th className="px-3 py-2 text-right font-medium">Encounters</th>
                  <th className="px-3 py-2 text-right font-medium">Chronic dx</th>
                  <th className="px-3 py-2 text-right font-medium">Total charges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline-soft)]">
                {byCity.slice(0, 15).map((c) => {
                  const maxCount = Math.max(...byCity.map((x) => x.count));
                  const sel = filter.city === c.city;
                  return (
                    <tr
                      key={c.city}
                      onClick={() => setFilter((prev) => ({ ...prev, city: prev.city === c.city ? undefined : c.city }))}
                      className={`cursor-pointer ${sel ? 'bg-[var(--clinical-teal-bg)]' : 'hover:bg-[var(--paper-deep)]'}`}
                    >
                      <td className="px-3 py-2.5 text-[var(--ink)]">{c.city}</td>
                      <td className="px-3 py-2.5 text-right">{formatNumber(c.count)}</td>
                      <td className="px-3 py-2.5">
                        <div className="h-2 rounded bg-[var(--paper-deep)] overflow-hidden">
                          <div className="h-full" style={{ width: `${(c.count / maxCount) * 100}%`, background: 'var(--color-brand-600)' }} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">{formatNumber(c.encounters)}</td>
                      <td className="px-3 py-2.5 text-right">{formatNumber(c.chronic)}</td>
                      <td className="px-3 py-2.5 text-right text-[var(--ink-strong)] font-medium">{formatCurrencyShort(c.charges)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Highest-charge patients" subtitle="Top 10 by total billed" className="lg:col-span-2">
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-sm tabular">
              <thead className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="px-3 py-2 text-left font-medium">MRN</th>
                  <th className="px-3 py-2 text-left font-medium">Patient</th>
                  <th className="px-3 py-2 text-left font-medium">City</th>
                  <th className="px-3 py-2 text-right font-medium">Visits</th>
                  <th className="px-3 py-2 text-center font-medium w-[120px]">Chronic</th>
                  <th className="px-3 py-2 text-right font-medium">Charges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline-soft)]">
                {[...patients].sort((a, b) => b.total_charges - a.total_charges).slice(0, 10).map((p) => (
                  <tr key={p.pat_id} onClick={() => navigate(`/patients/${encodeURIComponent(p.pat_id)}`)} className="cursor-pointer hover:bg-[var(--paper-deep)]">
                    <td className="px-3 py-2.5 font-mono text-[var(--ink-soft)]">{p.med_rec_num}</td>
                    <td className="px-3 py-2.5 text-[var(--ink-strong)] font-medium">{p.full_name}</td>
                    <td className="px-3 py-2.5 text-[var(--ink-muted)]">{p.city ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">{p.encounter_count}</td>
                    <td className="px-3 py-2.5"><ChronicLight n={p.active_chronic_count} /></td>
                    <td className="px-3 py-2.5 text-right text-[var(--ink-strong)] font-medium">{formatCurrency(p.total_charges)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[var(--clinical-teal)] text-[var(--clinical-teal)] text-xs font-medium px-2.5 py-1">
      {label}
      <button onClick={onClear} aria-label={`Remove ${label}`} className="text-[var(--clinical-teal)] hover:text-[var(--ink-strong)]">×</button>
    </span>
  );
}

function KPI({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  if (primary) {
    return (
      <div className="rounded-lg p-4 shadow-sm text-white" style={{ background: 'var(--color-brand-700)' }}>
        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/80">{label}</div>
        <div className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tabular leading-tight">{value}</div>
      </div>
    );
  }
  return (
    <div className="vital-tile">
      <div className="vital-tile-label">{label}</div>
      <div className="vital-tile-value tabular">{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`clinical-card ${className}`}>
      <div className="clinical-card-header">
        <h2 className="font-serif text-lg font-semibold text-[var(--ink-strong)]">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--ink-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">
        {children}
      </div>
    </section>
  );
}

// Traffic-light dot — green/amber/rose by chronic burden.
function ChronicLight({ n }: { n: number }) {
  const color = n >= 3 ? '#be123c' : n >= 1 ? '#b45309' : '#047857';
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="inline-block h-3 w-3 rounded-full ring-2 ring-white shadow" style={{ background: color }} />
      <span className="text-xs font-semibold tabular" style={{ color }}>{n}</span>
    </div>
  );
}
