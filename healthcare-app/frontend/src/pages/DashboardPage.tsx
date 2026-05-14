import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatCurrencyShort, formatNumber } from '../api/queries';
import type { PatientSearchResult } from '../types';
import { KPISkeleton, LoadingBanner, PanelSkeleton } from '../components/Skeleton';
import { Sparkline } from '../components/Sparkline';

const TOOLTIP_STYLE = {
  border: '1px solid var(--hairline)',
  borderRadius: 4,
  fontSize: 11,
  boxShadow: 'none',
  padding: '6px 8px',
  background: '#fff',
} as const;

// Single functional accent — everything else stays grayscale. Selected bars
// get the deep ink color; the "high-burden" cohort gets the rose alert color
// because that is the executive's call-to-action bar.
const ACCENT = '#0e7490';        // clinical teal — the one accent
const ALERT  = '#be123c';        // reserved for the ≥3 chronic bucket only
const NEUTRAL = '#cbd5e1';        // unselected bars
const SELECTED = '#0b1220';      // ink-strong for the active selection

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

  // Executive KPI block. We compute population-level rates the CFO/CMO actually
  // tracks, plus an "all-population" reference value so filtered views read as
  // comparisons rather than raw counts.
  const kpi = useMemo(() => calcKpi(patients), [patients]);
  const kpiAll = useMemo(() => calcKpi(all), [all]);

  // Birth-year cohort series — 12 equal-width buckets from oldest to youngest.
  // Drives KPI sparklines so each metric has a within-population distribution.
  const cohortSeries = useMemo(() => {
    const empty = { patients: [] as number[], visitsPerPt: [] as number[], chargePerEnc: [] as number[], highBurden: [] as number[] };
    if (patients.length === 0) return empty;
    const years = patients.map((p) => Number((p.birth_date ?? '').slice(0, 4))).filter((y) => Number.isFinite(y) && y > 1900);
    if (years.length < 2) return empty;
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    const buckets = 12;
    const span = Math.max(1, maxY - minY);
    const counts = new Array(buckets).fill(0);
    const encs = new Array(buckets).fill(0);
    const chg = new Array(buckets).fill(0);
    const highBurdenCount = new Array(buckets).fill(0);
    for (const p of patients) {
      const y = Number((p.birth_date ?? '').slice(0, 4));
      if (!Number.isFinite(y)) continue;
      let idx = Math.floor(((y - minY) / span) * buckets);
      if (idx >= buckets) idx = buckets - 1;
      if (idx < 0) idx = 0;
      counts[idx] += 1;
      encs[idx] += p.encounter_count;
      chg[idx] += p.total_charges;
      if (p.active_chronic_count >= 3) highBurdenCount[idx] += 1;
    }
    const visitsPerPt = counts.map((c, i) => (c ? encs[i] / c : 0));
    const chargePerEnc = counts.map((_, i) => (encs[i] ? chg[i] / encs[i] : 0));
    const highBurden = counts.map((c, i) => (c ? (highBurdenCount[i] / c) * 100 : 0));
    return { patients: counts, visitsPerPt, chargePerEnc, highBurden };
  }, [patients]);

  const byCity = useMemo(() => {
    const m = new Map<string, PatientSearchResult[]>();
    for (const p of patients) {
      const c = p.city ?? 'Unknown';
      const list = m.get(c) ?? [];
      list.push(p);
      m.set(c, list);
    }
    return Array.from(m.entries())
      .map(([city, rows]) => {
        const highBurden = rows.filter((r) => r.active_chronic_count >= 3).length;
        return {
          city,
          count: rows.length,
          encounters: rows.reduce((s, r) => s + r.encounter_count, 0),
          charges: rows.reduce((s, r) => s + r.total_charges, 0),
          chronic: rows.reduce((s, r) => s + r.active_chronic_count, 0),
          highBurden,
          highBurdenPct: rows.length ? (highBurden / rows.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  // Sort highest-charge patients with a derived $/visit signal so the
  // executive can distinguish high-utilizers from high-acuity outliers.
  const topCharge = useMemo(
    () =>
      [...patients]
        .sort((a, b) => b.total_charges - a.total_charges)
        .slice(0, 10)
        .map((p) => ({ ...p, perVisit: p.encounter_count > 0 ? p.total_charges / p.encounter_count : 0 })),
    [patients],
  );

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
          {Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} primary={i === 0} />)}
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
          Executive KPIs for the active panel. Click any bar, ZIP, or city row to cross-filter every metric.
        </p>
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

      {/* Executive KPIs — the four numbers a CFO/CMO should see first. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI
          label="High-burden cohort"
          sublabel="≥3 chronic dx · care-mgmt candidates"
          value={`${kpi.highBurdenPct.toFixed(1)}%`}
          context={`${formatNumber(kpi.highBurden)} of ${formatNumber(kpi.n)} patients`}
          comparison={filtered ? { ref: kpiAll.highBurdenPct, mine: kpi.highBurdenPct, suffix: 'pp vs panel' } : null}
          series={cohortSeries.highBurden}
          primary
        />
        <KPI
          label="Avg visits / patient"
          sublabel="Utilization intensity"
          value={kpi.visitsPerPt.toFixed(1)}
          context={`${formatNumber(kpi.totalEnc)} encounters`}
          comparison={filtered ? { ref: kpiAll.visitsPerPt, mine: kpi.visitsPerPt, suffix: ' vs panel' } : null}
          series={cohortSeries.visitsPerPt}
        />
        <KPI
          label="Avg charge / encounter"
          sublabel="Revenue per case"
          value={formatCurrency(kpi.chargePerEnc)}
          context={`${formatCurrencyShort(kpi.totalCharges)} total billed`}
          comparison={filtered ? { ref: kpiAll.chargePerEnc, mine: kpi.chargePerEnc, suffix: '% vs panel', pct: true } : null}
          series={cohortSeries.chargePerEnc}
        />
        <KPI
          label="Active panel"
          sublabel="Patients in current view"
          value={formatNumber(kpi.n)}
          context={filtered ? `${((kpi.n / kpiAll.n) * 100).toFixed(0)}% of full panel` : 'Full panel'}
          comparison={null}
          series={cohortSeries.patients}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title="Age distribution"
          subtitle="Where the panel concentrates by decade. Click a bar to filter."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,23,42,0.04)' }} formatter={(v: any) => [`${formatNumber(v)} patients`, '']} separator="" />
                <Bar
                  dataKey="count"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={42}
                  cursor="pointer"
                  onClick={(d: any) => setFilter((prev) => ({ ...prev, ageBucket: prev.ageBucket?.label === d.label ? undefined : d }))}
                >
                  <LabelList dataKey="count" position="top" fill="#475569" fontSize={10} formatter={(v: any) => formatNumber(Number(v))} />
                  {ageData.map((b, i) => {
                    const sel = filter.ageBucket?.label === b.label;
                    const dim = filter.ageBucket && !sel;
                    return <Cell key={i} fill={sel ? SELECTED : ACCENT} opacity={dim ? 0.25 : 1} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Chronic-condition burden"
          subtitle="Patients by active chronic dx count. The ≥3 bars are care-management candidates."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chronicData} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(15,23,42,0.04)' }} formatter={(v: any) => [`${formatNumber(v)} patients`, '']} separator="" />
                <Bar
                  dataKey="count"
                  radius={[2, 2, 0, 0]}
                  maxBarSize={42}
                  cursor="pointer"
                  onClick={(d: any) => setFilter((prev) => ({ ...prev, chronicBucket: prev.chronicBucket?.label === d.label ? undefined : d }))}
                >
                  <LabelList dataKey="count" position="top" fill="#475569" fontSize={10} formatter={(v: any) => formatNumber(Number(v))} />
                  {chronicData.map((b, i) => {
                    const sel = filter.chronicBucket?.label === b.label;
                    const dim = filter.chronicBucket && !sel;
                    // Color encodes one thing: which bars are the "alert" cohort
                    // (≥3 chronic). The rest are neutral so the alert bars carry
                    // all the visual weight.
                    const isAlert = b.lo >= 3;
                    const base = isAlert ? ALERT : NEUTRAL;
                    return <Cell key={i} fill={sel ? SELECTED : base} opacity={dim ? 0.25 : 1} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: ALERT }} />Care-management candidates ({kpi.highBurdenPct.toFixed(1)}%)</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: NEUTRAL }} />Stable / low-burden</span>
          </div>
        </Panel>

        <Panel
          title="Geographic risk by city"
          subtitle="Sorted by patient volume; risk % is the share with ≥3 chronic dx. Click a row to filter."
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-sm tabular">
              <thead className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="px-3 py-2 text-left font-semibold">City</th>
                  <th className="px-3 py-2 text-right font-semibold">Patients</th>
                  <th className="px-3 py-2 text-left font-semibold w-[22%]">Share of panel</th>
                  <th className="px-3 py-2 text-right font-semibold">Visits / pt</th>
                  <th className="px-3 py-2 text-right font-semibold">High-risk %</th>
                  <th className="px-3 py-2 text-right font-semibold">Total charges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline-soft)]">
                {byCity.slice(0, 15).map((c, _idx, arr) => {
                  const maxCount = Math.max(...arr.map((x) => x.count));
                  const sel = filter.city === c.city;
                  const visitsPerPt = c.count ? c.encounters / c.count : 0;
                  const riskHigh = c.highBurdenPct >= kpiAll.highBurdenPct + 2;
                  return (
                    <tr
                      key={c.city}
                      onClick={() => setFilter((prev) => ({ ...prev, city: prev.city === c.city ? undefined : c.city }))}
                      className={`cursor-pointer ${sel ? 'bg-[var(--clinical-teal-bg)]' : 'hover:bg-[var(--paper-deep)]'}`}
                    >
                      <td className="px-3 py-2.5 text-[var(--ink-strong)] font-medium">{c.city}</td>
                      <td className="px-3 py-2.5 text-right">{formatNumber(c.count)}</td>
                      <td className="px-3 py-2.5">
                        <div className="h-1.5 rounded-sm bg-[var(--paper-deep)] overflow-hidden">
                          <div className="h-full" style={{ width: `${(c.count / maxCount) * 100}%`, background: ACCENT }} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--ink)]">{visitsPerPt.toFixed(1)}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${riskHigh ? 'text-[var(--clinical-rose)]' : 'text-[var(--ink-muted)]'}`}>
                        {c.highBurdenPct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--ink-strong)] font-medium">{formatCurrencyShort(c.charges)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-2 text-[11px] text-[var(--ink-soft)]">
              Panel average high-risk share: <span className="tabular text-[var(--ink)]">{kpiAll.highBurdenPct.toFixed(1)}%</span>. Cities above panel average are highlighted in rose.
            </div>
          </div>
        </Panel>

        <Panel
          title="Highest-charge patients"
          subtitle="Top 10 by total billed. $/visit separates high-utilizers (low $/visit) from high-acuity outliers."
          className="lg:col-span-2"
        >
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-sm tabular">
              <thead className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)]">
                <tr className="border-b border-[var(--hairline)]">
                  <th className="px-3 py-2 text-left font-semibold">MRN</th>
                  <th className="px-3 py-2 text-left font-semibold">Patient</th>
                  <th className="px-3 py-2 text-left font-semibold">City</th>
                  <th className="px-3 py-2 text-right font-semibold">Visits</th>
                  <th className="px-3 py-2 text-right font-semibold">Chronic</th>
                  <th className="px-3 py-2 text-right font-semibold">$ / visit</th>
                  <th className="px-3 py-2 text-right font-semibold">Total charges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline-soft)]">
                {topCharge.map((p) => (
                  <tr key={p.pat_id} onClick={() => navigate(`/patients/${encodeURIComponent(p.pat_id)}`)} className="cursor-pointer hover:bg-[var(--paper-deep)]">
                    <td className="px-3 py-2.5 font-mono text-[var(--ink-soft)]">{p.med_rec_num}</td>
                    <td className="px-3 py-2.5 text-[var(--ink-strong)] font-medium">{p.full_name}</td>
                    <td className="px-3 py-2.5 text-[var(--ink-muted)]">{p.city ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">{p.encounter_count}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={p.active_chronic_count >= 3 ? 'text-[var(--clinical-rose)] font-semibold' : 'text-[var(--ink-muted)]'}>
                        {p.active_chronic_count}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[var(--ink-muted)]">{formatCurrency(Math.round(p.perVisit))}</td>
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

function calcKpi(rows: PatientSearchResult[]) {
  const n = rows.length;
  const totalEnc = rows.reduce((s, p) => s + p.encounter_count, 0);
  const totalCharges = rows.reduce((s, p) => s + p.total_charges, 0);
  const highBurden = rows.filter((p) => p.active_chronic_count >= 3).length;
  return {
    n,
    totalEnc,
    totalCharges,
    highBurden,
    highBurdenPct: n ? (highBurden / n) * 100 : 0,
    visitsPerPt: n ? totalEnc / n : 0,
    chargePerEnc: totalEnc ? totalCharges / totalEnc : 0,
  };
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[var(--clinical-teal)] text-[var(--clinical-teal)] text-xs font-medium px-2.5 py-1">
      {label}
      <button onClick={onClear} aria-label={`Remove ${label}`} className="text-[var(--clinical-teal)] hover:text-[var(--ink-strong)]">×</button>
    </span>
  );
}

interface Comparison {
  ref: number;
  mine: number;
  suffix: string;
  pct?: boolean;
}

function KPI({
  label,
  sublabel,
  value,
  context,
  comparison,
  series,
  primary,
}: {
  label: string;
  sublabel?: string;
  value: string;
  context?: string;
  comparison?: Comparison | null;
  series?: number[];
  primary?: boolean;
}) {
  const delta = comparison
    ? comparison.pct
      ? comparison.ref
        ? ((comparison.mine - comparison.ref) / comparison.ref) * 100
        : 0
      : comparison.mine - comparison.ref
    : null;
  const deltaPositive = delta !== null && delta > 0;
  const deltaText = delta === null
    ? null
    : `${delta >= 0 ? '+' : ''}${comparison?.pct ? delta.toFixed(0) : delta.toFixed(1)}${comparison?.suffix ?? ''}`;
  if (primary) {
    return (
      <div className="rounded-lg p-4 text-white relative overflow-hidden" style={{ background: 'var(--color-brand-700)' }}>
        <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/85">{label}</div>
        {sublabel && <div className="text-[10.5px] text-white/70 mt-0.5">{sublabel}</div>}
        <div className="mt-2 font-serif text-3xl sm:text-4xl font-semibold tabular leading-none">{value}</div>
        {context && <div className="mt-1.5 text-[11px] text-white/75 tabular">{context}</div>}
        {deltaText && <div className="mt-0.5 text-[11px] tabular text-white/85">{deltaText}</div>}
        {series && series.length >= 2 && (
          <Sparkline values={series} width={120} height={20} stroke="rgba(255,255,255,0.9)" fill="rgba(255,255,255,0.9)" className="mt-2" />
        )}
      </div>
    );
  }
  return (
    <div className="vital-tile">
      <div className="vital-tile-label">{label}</div>
      {sublabel && <div className="text-[10.5px] text-[var(--ink-soft)] mt-0.5">{sublabel}</div>}
      <div className="vital-tile-value tabular">{value}</div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        {context && <div className="text-[11px] text-[var(--ink-soft)] tabular truncate">{context}</div>}
        {deltaText && (
          <div className={`text-[11px] tabular shrink-0 ${deltaPositive ? 'text-[var(--clinical-rose)]' : 'text-[var(--clinical-green)]'}`}>
            {deltaText}
          </div>
        )}
      </div>
      {series && series.length >= 2 && (
        <Sparkline values={series} width={120} height={18} stroke={ACCENT} fill={ACCENT} className="mt-2" />
      )}
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
