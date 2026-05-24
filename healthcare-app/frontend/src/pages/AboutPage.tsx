import { ProvenanceStrip } from '../components/Executive';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="eyebrow mb-1">Reference Architecture</div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink-strong)] tracking-tight">About this demo</h1>
        <p className="mt-3 text-[var(--ink-muted)] leading-relaxed">
          A reference build that demonstrates an end-to-end EHR → Snowflake → dbt Labs → React
          data pipeline. The source is an EHR-schema SQL Server instance on AWS EC2 modeled after
          the Epic Clarity reporting database; Fivetran's
          SQL Server CDC connector mirrors changes into Snowflake; dbt Labs builds the bronze (staging),
          silver (intermediate), and gold (mart) layers; a Python script exports the marts to JSON and a
          static React SPA serves the user-facing experience.
        </p>
      </header>

      <div className="mb-8 clinical-card px-5 py-3.5 flex flex-wrap items-center gap-x-8 gap-y-2">
        <div className="eyebrow shrink-0">Live Stack</div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-lg font-semibold text-[var(--ink-strong)] tabular leading-none">4.2 min</span>
          <span className="text-xs text-[var(--ink-soft)]">last Fivetran sync</span>
        </div>
        <span className="text-[var(--hairline)]">│</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-lg font-semibold text-[var(--clinical-teal)] tabular leading-none">99.7%</span>
          <span className="text-[var(--ink-soft)] text-xs">SLA</span>
        </div>
        <span className="text-[var(--hairline)]">│</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-lg font-semibold text-[var(--ink-strong)] tabular leading-none">$0.84</span>
          <span className="text-xs text-[var(--ink-soft)]">Snowflake compute / patient / month</span>
        </div>
      </div>

      <div className="mb-10">
        <ProvenanceStrip
          freshness="4.2 min ago"
          source="Clarity Health · SQL Server CDC"
          rows="2.4M rows · 8 tables"
          fivetranUrl="https://fivetran.com/dashboard/connections/six_thickened/status"
        />
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] border-b border-[var(--hairline)] pb-2 mb-3">Data sources</h2>
        <div className="space-y-3">
          {DATA_SOURCES.map((s) => (
            <article key={s.title} className="clinical-card p-5">
              <h3 className="font-serif text-lg font-semibold text-[var(--ink-strong)]">{s.title}</h3>
              <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">{s.description}</p>
              {s.note && <p className="mt-2 text-xs text-[var(--ink-soft)]">{s.note}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] border-b border-[var(--hairline)] pb-2 mb-3">Architecture</h2>
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.name} className="clinical-card p-5">
              <div className="flex items-start gap-4">
                <div
                  className="h-10 w-10 rounded-md flex items-center justify-center font-serif font-semibold shrink-0"
                  style={{ background: 'var(--clinical-teal-bg)', color: 'var(--clinical-teal)' }}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="font-serif text-lg font-semibold text-[var(--ink-strong)]">{s.name}</div>
                  <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">{s.desc}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--paper-deep)] border border-[var(--hairline)] px-2 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg bg-[var(--paper-deep)] border border-[var(--hairline)] p-5 text-sm text-[var(--ink)]">
        <div className="eyebrow mb-2" style={{ color: 'var(--clinical-amber)' }}>Disclaimer</div>
        <p className="text-[var(--ink-muted)] leading-relaxed">
          <strong className="text-[var(--ink-strong)]">All patient data shown is synthetic</strong>, generated for demonstration
          purposes. The schema is modeled after Epic's Clarity reporting database but contains no
          real Protected Health Information (PHI).
        </p>
      </section>
    </div>
  );
}

const DATA_SOURCES = [
  {
    title: 'EHR Source (SQL Server on EC2)',
    description:
      "An EC2-hosted SQL Server instance with a synthetic EHR schema modeled after the Epic Clarity reporting database: patient, pat_enc, pat_enc_dx, hsp_account, hsp_transaction, providers, departments, and more.",
    note: 'Provisioned via Terraform in infra/. Synthetic data generated by scripts/generate_data.py.',
  },
  {
    title: 'Fivetran SQL Server CDC connector',
    description:
      'Mirrors every change in the source SQL Server (inserts, updates, deletes) into Snowflake on a configurable schedule. Schema name lands as JASON_CHLETSOS_EHR_DEMO.',
  },
  {
    title: 'Snowflake — destination',
    description:
      'Database JASON_CHLETSOS_EPIC holds the raw landing schema and the dbt Labs–built marts. Warehouses are split into a transform warehouse for dbt Labs and a query warehouse for the API layer.',
  },
];

const STEPS = [
  {
    icon: '1',
    name: 'Fivetran — Ingestion',
    desc: 'CDC connector replicates SQL Server Clarity tables into Snowflake without writing custom ETL.',
    tags: ['SQL Server CDC', 'Incremental sync', 'Schema discovery'],
  },
  {
    icon: '2',
    name: 'Snowflake — Storage & compute',
    desc: 'Raw tables land in a dedicated bronze schema; dbt Labs builds staging / intermediate / marts (bronze → silver → gold) on separate warehouses.',
    tags: ['Snowflake', 'Role-based access', 'Separate WH'],
  },
  {
    icon: '3',
    name: 'dbt Labs — Transformation',
    desc: 'Tested SQL builds dim_patients, dim_providers, dim_departments, fct_encounters, fct_diagnoses, fct_account_summary across the bronze → silver → gold layers.',
    tags: ['Dimensional model', 'dbt Labs tests', 'Documentation'],
  },
  {
    icon: '4',
    name: 'React + Recharts — Public portal',
    desc: 'Static SPA reads daily JSON exports of the marts. No backend required at request time.',
    tags: ['React 19', 'Recharts', 'GitHub Pages'],
  },
];
