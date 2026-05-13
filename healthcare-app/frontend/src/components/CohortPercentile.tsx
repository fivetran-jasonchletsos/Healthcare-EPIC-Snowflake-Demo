import { useEffect, useMemo, useState } from 'react';
import { api, formatCurrency, formatNumber } from '../api/queries';
import type { PatientSearchResult } from '../types';

interface Props {
  patId: string;
  age: number;
  sex: string;
  encounters: number;
  charges: number;
  chronic: number;
}

// "Where does this patient sit vs. peers in their age decade + sex cohort?"
// Mirrors the sheetz Neighborhood Percentile widget. Lives entirely
// client-side over the published snapshot — no Snowflake roundtrip.
export default function CohortPercentile({ patId, age, sex, encounters, charges, chronic }: Props) {
  const [peers, setPeers] = useState<PatientSearchResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.searchPatients({ limit: 200000 }).then((r) => {
      if (cancelled) return;
      const decade = Math.floor(age / 10) * 10;
      const filtered = r.results.filter((p) => p.sex === sex && Math.floor(p.age / 10) * 10 === decade && p.pat_id !== patId);
      setPeers(filtered);
    });
    return () => { cancelled = true; };
  }, [age, sex, patId]);

  const stats = useMemo(() => {
    if (!peers || peers.length === 0) return null;
    const encs = [...peers.map((p) => p.encounter_count), encounters].sort((a, b) => a - b);
    const chs = [...peers.map((p) => p.total_charges), charges].sort((a, b) => a - b);
    const chrs = [...peers.map((p) => p.active_chronic_count), chronic].sort((a, b) => a - b);

    const pct = (vals: number[], v: number) => {
      const rank = vals.filter((x) => x <= v).length;
      return (rank / vals.length) * 100;
    };
    const med = (vals: number[]) => vals[Math.floor(vals.length / 2)];

    return {
      n: peers.length,
      encounterPct: pct(encs, encounters),
      chargesPct:   pct(chs, charges),
      chronicPct:   pct(chrs, chronic),
      medianEnc:    med(encs),
      medianCharges: med(chs),
      medianChronic: med(chrs),
    };
  }, [peers, encounters, charges, chronic]);

  if (!stats || stats.n < 5) return null;

  const cohortLabel = `${Math.floor(age / 10) * 10}s · ${sex === 'M' ? 'male' : sex === 'F' ? 'female' : sex}`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Where this patient ranks</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Among {formatNumber(stats.n)} peers in the same age + sex cohort ({cohortLabel}).
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <Row
          label="Encounters"
          mine={encounters}
          median={stats.medianEnc}
          pct={stats.encounterPct}
          fmt={formatNumber}
        />
        <Row
          label="Annual charges"
          mine={charges}
          median={stats.medianCharges}
          pct={stats.chargesPct}
          fmt={formatCurrency}
        />
        <Row
          label="Chronic conditions"
          mine={chronic}
          median={stats.medianChronic}
          pct={stats.chronicPct}
          fmt={formatNumber}
        />
      </div>
    </section>
  );
}

function Row({ label, mine, median, pct, fmt }: { label: string; mine: number; median: number; pct: number; fmt: (n: number) => string }) {
  const above = mine >= median;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm tabular-nums">
          <strong className={above ? 'text-rose-700' : 'text-emerald-700'}>{fmt(mine)}</strong>
          <span className="text-slate-400"> vs. median {fmt(median)}</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-200 via-slate-200 to-rose-200">
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-px h-3.5 bg-slate-400" />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-brand-700 border-2 border-white shadow"
          style={{ left: `${Math.max(2, Math.min(98, pct))}%` }}
          title={`${pct.toFixed(0)}th percentile`}
        />
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{pct.toFixed(0)}th percentile in cohort</div>
    </div>
  );
}
