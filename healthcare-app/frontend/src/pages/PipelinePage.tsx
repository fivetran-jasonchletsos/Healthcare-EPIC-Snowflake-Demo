export default function PipelinePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-6">
        <div className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium uppercase tracking-wider mb-3">
          Pipeline Health
        </div>
        <h1 className="text-3xl font-bold text-slate-900">End-to-end status</h1>
        <p className="text-sm text-slate-500 mt-1">
          Snapshot of every layer in the stack: Fivetran CDC connector, Snowflake destination, dbt transformation,
          and this site. Live status comes from the Fivetran + Snowflake APIs once configured.
        </p>
      </header>

      <div className="space-y-4">
        {[
          { n: 1, title: 'Fivetran CDC connector', status: 'configured', detail: 'SQL Server → Snowflake. Run scripts/trigger_fivetran_sync.py to force a sync.' },
          { n: 2, title: 'Snowflake destination', status: 'configured', detail: 'JASON_CHLETSOS_EPIC.JASON_CHLETSOS_EHR_DEMO holds the raw CDC landing. Marts in CLINICAL / FINANCIAL schemas.' },
          { n: 3, title: 'dbt transformation', status: 'awaiting first run', detail: 'transform/profiles.yml uses Snowflake adapter. Run `dbt deps && dbt run && dbt test` once SNOWFLAKE_* env vars are set.' },
          { n: 4, title: 'JSON snapshot', status: 'awaiting first run', detail: 'scripts/build_snapshot.py queries the marts and writes healthcare-app/frontend/public/data/*.json.' },
          { n: 5, title: 'Pages site', status: 'will deploy on first push', detail: 'GitHub Pages serves the static SPA. Daily refresh runs the snapshot script via Actions.' },
        ].map((l) => (
          <article key={l.n} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <header className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-900 text-white text-xs font-bold">{l.n}</span>
                <div>
                  <div className="font-semibold text-slate-900">{l.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{l.detail}</div>
                </div>
              </div>
              <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider">
                {l.status}
              </span>
            </header>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
        This page becomes live once scripts/build_pipeline_status.py runs against the Fivetran + Snowflake APIs.
        Until then it shows the configured topology so the demo presenter can walk through each layer manually.
      </div>
    </div>
  );
}
