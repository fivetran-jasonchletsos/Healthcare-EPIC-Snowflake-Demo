import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/queries';
import { answer, askClaude, getApiKey, setApiKey, type AgentResponse } from '../agent';
import type { PatientSearchResult } from '../types';

const SUGGESTED = [
  'Patients with 3 or more chronic conditions',
  'Highest-charge patients in the snapshot',
  'Patients in ZIP 15217',
  'Medicare-age patients',
  'Highest encounter utilizers',
  'Pediatric patients',
];

export default function AgentPage() {
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [history, setHistory] = useState<{ q: string; r: AgentResponse; error?: string; pending?: boolean }[]>([]);
  const [useClaude, setUseClaude] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoAskedRef = useRef<string | null>(null);

  useEffect(() => {
    api.searchPatients({ limit: 200000 }).then((r) => setPatients(r.results)).finally(() => setLoading(false));
    setHasKey(!!getApiKey());
  }, []);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || loading) return;
    setQ('');
    if (useClaude && hasKey) {
      const idx = history.length;
      setHistory((h) => [...h, { q: text, r: { intent: 'pending', source: 'claude', summary: 'Asking Claude…' }, pending: true }]);
      try {
        const r = await askClaude(text, patients);
        setHistory((h) => h.map((entry, i) => (i === idx ? { q: text, r } : entry)));
      } catch (err: any) {
        const fallback = answer(text, patients);
        const message = err?.message ?? String(err);
        setHistory((h) => h.map((entry, i) => (i === idx ? { q: text, r: fallback, error: message } : entry)));
      }
    } else {
      setHistory((h) => [...h, { q: text, r: answer(text, patients) }]);
    }
  };

  useEffect(() => {
    const preset = searchParams.get('q');
    if (!preset || loading || autoAskedRef.current === preset) return;
    autoAskedRef.current = preset;
    ask(preset);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  const saveKey = () => { setApiKey(apiKeyInput || null); setHasKey(!!apiKeyInput); setShowSettings(false); setApiKeyInput(''); };
  const clearKey = () => { setApiKey(null); setHasKey(false); setUseClaude(false); };

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
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Mode:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!useClaude} onChange={() => setUseClaude(false)} className="accent-brand-600" />
              <span className="font-medium">Local rules</span>
              <span className="text-xs text-slate-400">(always on)</span>
            </label>
            <label className={`flex items-center gap-2 cursor-pointer ${!hasKey ? 'opacity-50' : ''}`}>
              <input type="radio" checked={useClaude} onChange={() => hasKey && setUseClaude(true)} disabled={!hasKey} className="accent-violet-600" />
              <span className="font-medium">Ask Claude</span>
              {!hasKey && <span className="text-xs text-slate-400">(needs API key)</span>}
            </label>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="text-xs text-slate-500 hover:text-slate-800">
            ⚙ Settings
          </button>
        </div>

        {showSettings && (
          <div className="border-b border-slate-100 px-4 py-4 bg-amber-50 text-sm">
            <p className="text-amber-900 mb-3">
              Paste your Anthropic API key to enable Claude mode. Stored only in this browser's localStorage.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={hasKey ? '••••••••••••••• (key saved)' : 'sk-ant-api03-...'}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-mono"
              />
              <button onClick={saveKey} className="rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2">Save</button>
              {hasKey && (
                <button onClick={clearKey} className="rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm px-3 py-2">Clear</button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={(e: FormEvent) => { e.preventDefault(); ask(q); }} className="px-4 py-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={loading ? 'Loading snapshot…' : 'Ask in plain English'}
            className="flex-1 rounded-md border border-slate-300 px-4 py-3 text-sm"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !q.trim()} className="rounded-md bg-brand-700 hover:bg-brand-800 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-3">
            Ask
          </button>
        </form>

        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="text-xs rounded-full bg-slate-100 hover:bg-brand-100 hover:text-brand-700 text-slate-700 px-3 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {history.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Ask a question to see how the agent reasons over the snapshot.
          </div>
        )}
        {[...history].reverse().map((h, i) => {
          const isClaude = h.r.source === 'claude';
          return (
            <article key={history.length - i} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <header className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Question</div>
                  <div className="font-medium text-slate-900">{h.q}</div>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${isClaude ? 'bg-violet-100 text-violet-700' : 'bg-brand-100 text-brand-700'}`}>
                  {isClaude ? 'Claude' : 'Rules'}
                </span>
              </header>
              <div className="p-4 text-sm">
                {h.error && (
                  <div className="mb-3 rounded-md bg-rose-50 text-rose-700 px-3 py-2 text-xs">
                    Claude error — falling back to local rules. {h.error}
                  </div>
                )}
                <p className={`whitespace-pre-wrap ${h.pending ? 'text-slate-400 animate-pulse' : 'text-slate-800'}`}>{h.r.summary}</p>
                {h.r.table && h.r.table.rows.length > 0 && (
                  <div className="mt-4 overflow-x-auto -mx-2 px-2">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 uppercase tracking-wider text-slate-500">
                        <tr>{h.r.table.columns.map((c) => <th key={c} className="px-3 py-2 text-left whitespace-nowrap">{c}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {h.r.table.rows.map((row, ri) => (
                          <tr key={ri} className={h.r.patIds?.[ri] ? 'cursor-pointer hover:bg-brand-50/40' : ''} onClick={() => {
                            const id = h.r.patIds?.[ri];
                            if (id) navigate(`/patients/${encodeURIComponent(id)}`);
                          }}>
                            {row.map((cell, ci) => <td key={ci} className="px-3 py-2 whitespace-nowrap">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {h.r.patIds && <div className="mt-2 text-[11px] text-slate-400">Tip: click a row to open the patient.</div>}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
