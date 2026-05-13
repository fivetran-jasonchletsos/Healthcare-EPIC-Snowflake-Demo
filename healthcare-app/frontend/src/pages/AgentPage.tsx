import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCurrency, formatNumber } from '../api/queries';
import type { PatientSearchResult } from '../types';

const SUGGESTED = [
  'Top diagnoses by encounter count',
  'Patients with 3+ chronic conditions',
  'Outstanding balances over $5,000',
  'Average length of stay by department',
  'Patients in ZIP 15217',
  'Highest-charge patients',
];

interface AgentResponse {
  summary: string;
  table?: { columns: string[]; rows: (string | number)[][] };
  parcelIds?: string[];
}

export default function AgentPage() {
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [history, setHistory] = useState<{ q: string; r: AgentResponse }[]>([]);

  useEffect(() => {
    api.searchPatients({ limit: 200000 }).then((r) => setPatients(r.results)).finally(() => setLoading(false));
  }, []);

  const ask = (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setQ('');
    const r = answer(q, patients);
    setHistory((h) => [...h, { q, r }]);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="inline-flex items-center rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-xs font-medium uppercase tracking-wider mb-3">
          Clinical Insight Agent
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-slate-900">Ask anything about the patient population</h1>
          <Link to="/about-agent" className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm text-violet-700 hover:text-violet-900 font-medium">
            How it works <span aria-hidden>→</span>
          </Link>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Local rules engine answers questions over the published snapshot — no roundtrips to Snowflake.
        </p>
      </header>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex flex-col sm:flex-row gap-2 mb-4"
      >
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? 'Loading snapshot…' : 'Ask in plain English — e.g. "highest-charge patients"'}
          className="flex-1 rounded-md border border-slate-300 px-4 py-3 text-sm focus:outline-2 focus:outline-violet-300"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className="rounded-md bg-violet-700 hover:bg-violet-800 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-3"
        >
          Ask
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={loading}
            className="text-xs rounded-full bg-slate-100 hover:bg-violet-100 hover:text-violet-700 text-slate-700 px-3 py-1.5"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {history.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Ask a question to see how the agent reasons over the snapshot.
          </div>
        )}
        {[...history].reverse().map((h, i) => (
          <article key={history.length - i} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <header className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Question</div>
              <div className="font-medium text-slate-900">{h.q}</div>
            </header>
            <div className="p-4 text-sm text-slate-800">
              <p>{h.r.summary}</p>
              {h.r.table && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                      <tr>
                        {h.r.table.columns.map((c) => (
                          <th key={c} className="px-3 py-2 text-left whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {h.r.table.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function answer(q: string, patients: PatientSearchResult[]): AgentResponse {
  const ql = q.toLowerCase();
  if (/3\+|three\s|multi.+chronic|complex/.test(ql)) {
    const hits = patients.filter((p) => p.active_chronic_count >= 3).slice(0, 25);
    return {
      summary: `${hits.length} patients carry 3+ active chronic conditions.`,
      table: {
        columns: ['MRN', 'Name', 'Age', 'Chronic', 'Visits'],
        rows: hits.map((p) => [p.med_rec_num, p.full_name, p.age, p.active_chronic_count, formatNumber(p.encounter_count)]),
      },
    };
  }
  if (/outstanding|balance|charge|owe|\$\d/.test(ql)) {
    const hits = [...patients].sort((a, b) => b.total_charges - a.total_charges).slice(0, 25);
    return {
      summary: `Top 25 patients by total charges in the snapshot.`,
      table: {
        columns: ['MRN', 'Name', 'Visits', 'Charges'],
        rows: hits.map((p) => [p.med_rec_num, p.full_name, p.encounter_count, formatCurrency(p.total_charges)]),
      },
    };
  }
  const zipMatch = q.match(/(\d{5})/);
  if (zipMatch) {
    const hits = patients.filter((p) => p.zip_code === zipMatch[1]).slice(0, 25);
    return {
      summary: `${hits.length} patients in ZIP ${zipMatch[1]}.`,
      table: hits.length
        ? {
            columns: ['MRN', 'Name', 'Age', 'PCP', 'Visits'],
            rows: hits.map((p) => [p.med_rec_num, p.full_name, p.age, p.primary_care_provider ?? '—', p.encounter_count]),
          }
        : undefined,
    };
  }
  if (/highest|top|most/.test(ql) && /visit|encounter/.test(ql)) {
    const hits = [...patients].sort((a, b) => b.encounter_count - a.encounter_count).slice(0, 25);
    return {
      summary: `Top 25 patients by encounter count.`,
      table: {
        columns: ['MRN', 'Name', 'Age', 'Visits', 'Charges'],
        rows: hits.map((p) => [p.med_rec_num, p.full_name, p.age, p.encounter_count, formatCurrency(p.total_charges)]),
      },
    };
  }
  // Fallback: free-text match against name/MRN/city.
  const hits = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(ql) ||
      p.med_rec_num.toLowerCase().includes(ql) ||
      (p.city ?? '').toLowerCase().includes(ql),
  ).slice(0, 25);
  return {
    summary: hits.length ? `${hits.length} patients match "${q}".` : `No matches for "${q}". Try one of the suggested questions.`,
    table: hits.length
      ? {
          columns: ['MRN', 'Name', 'Age', 'City', 'Visits'],
          rows: hits.map((p) => [p.med_rec_num, p.full_name, p.age, p.city ?? '—', p.encounter_count]),
        }
      : undefined,
  };
}
