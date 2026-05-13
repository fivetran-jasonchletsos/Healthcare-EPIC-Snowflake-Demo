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
import { api, formatCurrency, formatCurrencyShort, formatNumber } from '../api/queries';
import type { PatientSearchResult } from '../types';

const TOOLTIP_STYLE = {
  border: 'none',
  borderRadius: 6,
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  padding: '8px 10px',
} as const;
const ACCENT = '#0f766e';

export default function DashboardPage() {
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.searchPatients({ limit: 200000 }).then((r) => setPatients(r.results)).finally(() => setLoading(false));
  }, []);

  const byCity = useMemo(() => {
    const m = new Map<string, PatientSearchResult[]>();
    for (const p of patients) {
      const c = p.city ?? 'Unknown';
      const list = m.get(c) ?? [];
      list.push(p);
      m.set(c, list);
    }
    return Array.from(m.entries()).map(([city, rows]) => ({
      city,
      count: rows.length,
      encounters: rows.reduce((s, r) => s + r.encounter_count, 0),
      charges: rows.reduce((s, r) => s + r.total_charges, 0),
      chronic: rows.reduce((s, r) => s + r.active_chronic_count, 0),
    }));
  }, [patients]);

  const ageBuckets = useMemo(() => {
    const buckets = [
      { label: '0–17', lo: 0, hi: 18, count: 0 },
      { label: '18–34', lo: 18, hi: 35, count: 0 },
      { label: '35–54', lo: 35, hi: 55, count: 0 },
      { label: '55–64', lo: 55, hi: 65, count: 0 },
      { label: '65–79', lo: 65, hi: 80, count: 0 },
      { label: '80+', lo: 80, hi: 200, count: 0 },
    ];
    for (const p of patients) {
      const b = buckets.find((b) => p.age >= b.lo && p.age < b.hi);
      if (b) b.count += 1;
    }
    return buckets;
  }, [patients]);

  const chronicHist = useMemo(() => {
    const buckets = [0, 1, 2, 3, 4, 5].map((n) => ({ label: `${n}${n === 5 ? '+' : ''}`, count: 0 }));
    for (const p of patients) {
      const idx = Math.min(5, p.active_chronic_count);
      buckets[idx].count += 1;
    }
    return buckets;
  }, [patients]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 max-w-3xl">
        <div className="inline-flex items-center rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-medium uppercase tracking-wider mb-3">
          Dashboard
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinical population overview</h1>
        <p className="text-sm text-slate-500 mt-2">
          Aggregations across the gold-layer marts in Snowflake. All numbers computed in your browser from the published snapshot.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KPI label="Patients" value={loading ? '—' : formatNumber(patients.length)} />
        <KPI label="Encounters (sum)" value={loading ? '—' : formatNumber(patients.reduce((s, p) => s + p.encounter_count, 0))} />
        <KPI label="Active chronic dx" value={loading ? '—' : formatNumber(patients.reduce((s, p) => s + p.active_chronic_count, 0))} primary />
        <KPI label="Total charges" value={loading ? '—' : formatCurrency(patients.reduce((s, p) => s + p.total_charges, 0))} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Age distribution" subtitle="All patients in the snapshot">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageBuckets}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} patients`, '']} separator="" />
                <Bar dataKey="count" fill={ACCENT} radius={[3, 3, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Chronic-condition burden" subtitle="How many active chronic conditions each patient carries">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chronicHist}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v} patients`, '']} separator="" />
                <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={48}>
                  {chronicHist.map((_, i) => (
                    <Cell key={i} fill={['#10b981', '#65a30d', '#eab308', '#f59e0b', '#ef4444', '#b91c1c'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top cities by patient count" className="lg:col-span-2">
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="min-w-full text-sm tabular-nums">
              <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-medium">City</th>
                  <th className="px-3 py-2 text-right font-medium">Patients</th>
                  <th className="px-3 py-2 text-right font-medium">Encounters</th>
                  <th className="px-3 py-2 text-right font-medium">Chronic dx</th>
                  <th className="px-3 py-2 text-right font-medium">Charges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...byCity].sort((a, b) => b.count - a.count).slice(0, 12).map((c) => (
                  <tr key={c.city}>
                    <td className="px-3 py-2.5 text-slate-700">{c.city}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(c.count)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(c.encounters)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(c.chronic)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-900 font-medium">{formatCurrencyShort(c.charges)}</td>
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

function KPI({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${primary ? 'bg-teal-700 text-white shadow-md' : 'bg-white border border-slate-200'}`}>
      <div className={`text-[10px] uppercase tracking-wider font-medium ${primary ? 'text-teal-100' : 'text-slate-500'}`}>{label}</div>
      <div className={`mt-1 text-xl sm:text-2xl font-semibold tabular-nums ${primary ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
