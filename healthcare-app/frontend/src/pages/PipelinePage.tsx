import { useMemo, useState } from 'react';

type FailureKey = 'connector' | 'destination' | 'transformation' | 'pages';

interface LayerState {
  ok: boolean;
  status: string;
  detail: string;
  failureDetail?: string;
}

export default function PipelinePage() {
  const [failures, setFailures] = useState<Set<FailureKey>>(new Set());

  const toggle = (k: FailureKey) =>
    setFailures((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const layers: Record<FailureKey, LayerState> = useMemo(() => {
    const f = failures;
    return {
      connector: f.has('connector')
        ? { ok: false, status: 'sync failed', detail: 'Fivetran SQL Server CDC — last sync hit a connection timeout.', failureDetail: 'Simulated: source SQL Server unreachable. Last successful sync 18h ago.' }
        : { ok: true, status: 'on schedule', detail: 'Fivetran SQL Server CDC connector. Last sync 6h ago. Next sync in 24m.' },
      destination: f.has('destination')
        ? { ok: false, status: 'auth expired', detail: 'JASON_CHLETSOS_EPIC on Snowflake', failureDetail: 'Simulated: warehouse rejected last connection — service-account token may have expired.' }
        : { ok: true, status: 'connected', detail: 'JASON_CHLETSOS_EPIC database on Snowflake. JASON_CHLETSOS_TRANSFORM_WH warehouse healthy.' },
      transformation: f.has('transformation')
        ? { ok: false, status: 'run failed', detail: 'dbt run — model fct_encounters', failureDetail: 'Simulated: model compilation failed. Test "not_null_pat_id" returned 12 failures in stg_clarity__pat_enc.' }
        : { ok: true, status: 'last run passed', detail: 'dbt build completed 4h ago. 11 staging + 4 intermediate + 6 mart models passed all tests.' },
      pages: f.has('pages')
        ? { ok: false, status: 'deploy failed', detail: 'GitHub Pages deploy workflow', failureDetail: 'Simulated: build step failed — TypeScript error in DashboardPage.tsx:142. Last good deploy 2h ago.' }
        : { ok: true, status: 'deployed', detail: 'GitHub Pages serving the current snapshot. Last deploy 12m ago.' },
    };
  }, [failures]);

  const demoMode = failures.size > 0;
  const anyDown = !Object.values(layers).every((l) => l.ok);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6 border-b border-[var(--hairline)] pb-4">
        <div className="eyebrow mb-1">Pipeline Health</div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">End-to-end status</h1>
        <p className="text-sm text-[var(--ink-muted)] mt-1 max-w-3xl leading-relaxed">
          Live posture of every layer that produces the clinical analytics surface: Fivetran SQL Server CDC,
          Snowflake destination, dbt transformations, and the static frontend deploy. Toggle <em>Simulate failure</em>
          on any layer to walk through observability and incident response patterns.
        </p>
      </header>

      <div
        className={`rounded-md border p-4 flex items-start gap-3 ${
          !anyDown
            ? 'bg-[var(--clinical-green-bg)] border-emerald-200'
            : 'bg-[var(--clinical-rose-bg)] border-rose-200'
        }`}
      >
        <span className={`mt-1 inline-block h-2.5 w-2.5 rounded-full ${!anyDown ? 'bg-[var(--clinical-green)]' : 'bg-[var(--clinical-rose)]'} animate-pulse`} />
        <div className="flex-1">
          <div className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${!anyDown ? 'text-[var(--clinical-green)]' : 'text-[var(--clinical-rose)]'}`}>
            {!anyDown ? 'All systems operational' : 'Action required'}
          </div>
          <div className={`mt-0.5 text-sm ${!anyDown ? 'text-emerald-900' : 'text-rose-900'}`}>
            {!anyDown
              ? 'Every layer of the pipeline is healthy. Data is flowing end-to-end.'
              : 'One or more layers reported a failure — see the affected card below.'}
          </div>
        </div>
      </div>

      {demoMode && (
        <div className="mt-4 rounded-md border border-amber-200 bg-[var(--clinical-amber-bg)] px-4 py-3 flex items-start justify-between gap-3">
          <div className="text-sm text-[var(--ink)]">
            <span className="font-semibold text-[var(--clinical-amber)]">Demo mode active</span>
            <span className="text-[var(--ink-muted)]"> — {failures.size} {failures.size === 1 ? 'layer is' : 'layers are'} showing simulated failures. The real pipeline is unaffected.</span>
          </div>
          <button
            onClick={() => setFailures(new Set())}
            className="shrink-0 rounded-md border border-amber-300 bg-white hover:bg-[var(--clinical-amber-bg)] text-[var(--clinical-amber)] text-xs font-semibold px-3 py-1.5"
          >
            Restore all
          </button>
        </div>
      )}

      <Section n={1} title="Fivetran CDC connector" layer={layers.connector} sim={failures.has('connector')} onSim={() => toggle('connector')}>
        <KV k="Connector" v="jason_chletsos_ehr_demo (SQL Server CDC)" />
        <KV k="Schema" v="JASON_CHLETSOS_EHR_DEMO" />
        <KV k="Frequency" v="Every 1 hr" />
        <KV k="Tables synced" v="patient, pat_enc, pat_enc_dx, hsp_account, hsp_transaction, medications, providers, departments" />
      </Section>

      <Section n={2} title="Snowflake destination" layer={layers.destination} sim={failures.has('destination')} onSim={() => toggle('destination')}>
        <KV k="Account" v="<your-account>.us-east-1" mono />
        <KV k="Database" v="JASON_CHLETSOS_EPIC" mono />
        <KV k="Warehouses" v="JASON_CHLETSOS_TRANSFORM_WH · JASON_CHLETSOS_QUERY_WH" />
        <KV k="Auth" v="Service account with RSA key-pair" />
      </Section>

      <Section n={3} title="dbt transformation" layer={layers.transformation} sim={failures.has('transformation')} onSim={() => toggle('transformation')}>
        <KV k="Project" v="healthcare_clarity" mono />
        <KV k="Target schemas" v="STAGING · INTERMEDIATE · CLINICAL · FINANCIAL" />
        <KV k="Models" v="11 staging · 4 intermediate · 6 marts" />
        <KV k="Trigger" v="Cron 02:55, 08:55, 14:55, 20:55 UTC — post-Fivetran-sync" />
      </Section>

      <Section n={4} title="GitHub Pages site" layer={layers.pages} sim={failures.has('pages')} onSim={() => toggle('pages')}>
        <KV k="URL" v="fivetran-jasonchletsos.github.io/Healthcare-EPIC-Snowflake-Demo/" mono />
        <KV k="Build" v="React/Vite SPA · Snowflake-sourced JSON snapshot" />
        <KV k="Deploy trigger" v="Push to main → Actions workflow" />
      </Section>

      <div className="mt-8 clinical-card p-4 text-xs text-[var(--ink-soft)] leading-relaxed">
        Live pipeline metadata appears once <code className="font-mono bg-[var(--paper-deep)] px-1.5 py-0.5 rounded border border-[var(--hairline)]">scripts/build_pipeline_status.py</code>{' '}
        runs against the Fivetran + Snowflake APIs. Until then this page shows the configured topology so demo
        presenters can walk through each layer manually.
      </div>
    </div>
  );
}

function Section({
  n, title, layer, children, sim, onSim,
}: {
  n: number;
  title: string;
  layer: LayerState;
  children: React.ReactNode;
  sim: boolean;
  onSim: () => void;
}) {
  return (
    <section className="mt-5 clinical-card overflow-hidden">
      <header className={`px-5 py-3.5 border-b border-[var(--hairline-soft)] flex items-start justify-between gap-3 ${layer.ok ? 'bg-gradient-to-b from-white to-[var(--clinical-green-bg)]' : 'bg-gradient-to-b from-white to-[var(--clinical-rose-bg)]'}`}>
        <div className="flex items-start gap-3">
          <span
            className="inline-flex items-center justify-center h-8 w-8 rounded-md font-serif font-semibold text-white text-sm shadow-sm shrink-0"
            style={{ background: layer.ok ? 'var(--clinical-teal)' : 'var(--clinical-rose)' }}
          >
            {n}
          </span>
          <div className="min-w-0">
            <div className="font-serif font-semibold text-[var(--ink-strong)]">{title}</div>
            <div className="text-xs text-[var(--ink-muted)] mt-0.5">{layer.detail}</div>
          </div>
        </div>
        <span className={`status-pill shrink-0 ${layer.ok ? 'healthy' : 'alert'}`}>{layer.status}</span>
      </header>
      <dl className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        {children}
      </dl>
      {layer.failureDetail && (
        <div className="mx-5 mb-4 rounded-md border border-rose-200 bg-[var(--clinical-rose-bg)] text-[var(--clinical-rose)] text-xs p-3 flex items-start gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 mt-0.5 shrink-0">
            <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span><span className="font-semibold uppercase tracking-wider text-[10px]">Incident detail:</span> <span className="text-[var(--ink)]">{layer.failureDetail}</span></span>
        </div>
      )}
      <footer className="px-5 py-2.5 border-t border-[var(--hairline-soft)] bg-[var(--paper-deep)] flex justify-end">
        <button
          onClick={onSim}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors ${
            sim
              ? 'bg-[var(--clinical-amber-bg)] hover:bg-amber-100 border-amber-300 text-[var(--clinical-amber)]'
              : 'bg-white hover:bg-[var(--clinical-rose-bg)] border-[var(--hairline)] hover:border-rose-300 text-[var(--ink-muted)] hover:text-[var(--clinical-rose)]'
          }`}
        >
          {sim ? 'Restore layer' : 'Simulate failure'}
        </button>
      </footer>
    </section>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-soft)] font-semibold">{k}</dt>
      <dd className={`text-[var(--ink-strong)] ${mono ? 'font-mono text-xs break-all' : ''}`}>{v}</dd>
    </>
  );
}
