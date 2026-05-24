// Clarity Health — Open Data Infrastructure architecture page.
//
// Ported from Verity Insurance's ArchitecturePage to give Clarity the
// same medallion / multi-engine surface (Snowflake Summit 2026 recording
// set, 9am). Healthcare-flavoured: Clarity EHR (SQL Server) + payor
// claims (Oracle) + HL7 v2 feed + CMS public datasets. Snowflake is
// the primary engine; Athena/DuckDB/Trino/Spark stay listed as the
// same open-lake reads.
//
// Iceberg table list is inlined (no extra API endpoint) so the page
// can render in the recording even if connectors are paused.

import { useState } from 'react';
import { AliveMedallion, type SourceNode, type EngineNode } from '../components/AliveMedallion';

const CLARITY_SOURCES: SourceNode[] = [
  { id: 'sql',    label: 'SQL Server',  sub: 'Clarity EHR · CDC (8 tables)',     logo: 'sqlserver' },
  { id: 'oracle', label: 'Oracle',      sub: 'Payor Mart · LogMiner CDC',        logo: 'oracle' },
  { id: 'hl7',    label: 'HL7 v2',      sub: 'ADT events · MLLP listener',        logo: 'hl7' },
  { id: 'cms',    label: 'CMS NPPES',   sub: 'NPI registry · weekly',             logo: 'cms' },
];

const CLARITY_ENGINES: EngineNode[] = [
  { name: 'Snowflake', active: true,  logo: 'snowflake' },
  { name: 'Athena',                   logo: 'athena' },
  { name: 'DuckDB',                   logo: 'duckdb' },
  { name: 'Trino',                    logo: 'trino' },
  { name: 'Spark',                    logo: 'spark' },
];

// ─── Types (local) ──────────────────────────────────────────────────────────

interface IcebergTable {
  database: 'bronze' | 'silver' | 'gold';
  table: string;
  source_system: string;
  rows: number;
  bytes: number;
  schema_columns: number;
  partitions: string[];
  last_updated_at: string;
}

interface QueryEngine {
  name: 'Snowflake' | 'Athena' | 'DuckDB' | 'Trino' | 'Spark';
  status: 'active' | 'available' | 'demo';
  description: string;
  sample_query: string;
}

const TABLES: IcebergTable[] = [
  { database: 'bronze', table: 'bronze.clarity__patient',          source_system: 'sql_server · Clarity EHR', rows: 412_820,   bytes: 318_440_000,   schema_columns: 142, partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.clarity__pat_enc',          source_system: 'sql_server · Clarity EHR', rows: 4_182_220, bytes: 2_140_000_000, schema_columns: 187, partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.clarity__pat_enc_dx',       source_system: 'sql_server · Clarity EHR', rows: 12_414_380,bytes: 4_820_000_000, schema_columns: 24,  partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.clarity__hsp_account',      source_system: 'sql_server · Clarity EHR', rows: 1_842_200, bytes: 1_120_000_000, schema_columns: 92,  partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.clarity__hsp_transaction',  source_system: 'sql_server · Clarity EHR', rows: 18_142_200,bytes: 5_410_000_000, schema_columns: 71,  partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.clarity__medications',      source_system: 'sql_server · Clarity EHR', rows: 864_200,   bytes: 462_000_000,   schema_columns: 38,  partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:14:00Z' },
  { database: 'bronze', table: 'bronze.payor__claims',             source_system: 'oracle · Payor Mart',      rows: 2_864_000, bytes: 1_810_000_000, schema_columns: 64,  partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:11:00Z' },
  { database: 'bronze', table: 'bronze.hl7__adt_events',           source_system: 'http · HL7 v2 feed',       rows: 384_000,   bytes: 142_000_000,   schema_columns: 28,  partitions: ['ingest_date'],            last_updated_at: '2026-05-24T07:12:00Z' },
  { database: 'bronze', table: 'bronze.cms__npi_registry',         source_system: 'http · CMS NPPES',         rows: 12_460,    bytes: 18_400_000,    schema_columns: 32,  partitions: [],                          last_updated_at: '2026-05-23T03:00:00Z' },

  { database: 'silver', table: 'silver.int_patient_encounter_spine',source_system: 'dbt · merged',            rows: 1_842_200, bytes: 980_000_000,   schema_columns: 62,  partitions: ['encounter_date'],         last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_chronic_conditions',    source_system: 'dbt · merged',             rows: 412_820,   bytes: 224_000_000,   schema_columns: 24,  partitions: [],                          last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_encounter_diagnoses',   source_system: 'dbt · merged',             rows: 12_414_380,bytes: 3_120_000_000, schema_columns: 18,  partitions: ['encounter_date'],         last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_financials',            source_system: 'dbt · merged',             rows: 18_142_200,bytes: 4_410_000_000, schema_columns: 31,  partitions: ['transaction_date'],       last_updated_at: '2026-05-24T07:18:00Z' },
  { database: 'silver', table: 'silver.int_claims_reconciled',     source_system: 'dbt · merged',             rows: 2_864_000, bytes: 1_640_000_000, schema_columns: 42,  partitions: ['claim_period'],           last_updated_at: '2026-05-24T07:18:00Z' },

  { database: 'gold',   table: 'gold.dim_patients',                source_system: 'dbt mart',                 rows: 412_820,   bytes: 184_000_000,   schema_columns: 38,  partitions: [],                          last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.dim_providers',               source_system: 'dbt mart',                 rows: 18_240,    bytes: 12_400_000,    schema_columns: 28,  partitions: [],                          last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.dim_departments',             source_system: 'dbt mart',                 rows: 860,       bytes: 480_000,       schema_columns: 14,  partitions: [],                          last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_encounters',              source_system: 'dbt mart',                 rows: 1_842_200, bytes: 720_000_000,   schema_columns: 44,  partitions: ['encounter_month'],        last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_diagnoses',               source_system: 'dbt mart',                 rows: 12_414_380,bytes: 2_410_000_000, schema_columns: 22,  partitions: ['encounter_month'],        last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_account_summary',         source_system: 'dbt mart',                 rows: 1_842_200, bytes: 612_000_000,   schema_columns: 26,  partitions: ['statement_period'],       last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_chronic_cohorts',         source_system: 'dbt mart',                 rows: 412_820,   bytes: 184_000_000,   schema_columns: 18,  partitions: [],                          last_updated_at: '2026-05-24T07:22:00Z' },
  { database: 'gold',   table: 'gold.fct_payor_denied_claims',     source_system: 'dbt mart',                 rows: 184_220,   bytes: 96_000_000,    schema_columns: 31,  partitions: ['denial_month'],           last_updated_at: '2026-05-24T07:22:00Z' },
];

const ENGINES: QueryEngine[] = [
  {
    name: 'Snowflake',
    status: 'active',
    description: 'Primary engine for the Clarity gold layer. Reads Iceberg externals through Polaris catalog; auto-suspends between queries. Where the front end, the cost-estimator, and Cortex Analyst all land.',
    sample_query: `SELECT
  p.patient_id, p.age_band, p.payor_class,
  c.condition_label, c.last_seen_at,
  e.encounter_count_12m, e.ed_visit_count_12m
FROM gold.dim_patients         p
JOIN gold.fct_chronic_cohorts  c USING (patient_id)
JOIN gold.fct_encounters       e USING (patient_id)
WHERE c.condition_label = 'CHF'
  AND e.ed_visit_count_12m >= 2
ORDER BY e.ed_visit_count_12m DESC
LIMIT 50;`,
  },
  {
    name: 'Athena',
    status: 'available',
    description: 'Serverless reads against the same Iceberg gold tables via Glue. Useful for compliance/regulatory ad-hoc that doesn\'t need to pay for warehouse time.',
    sample_query: `SELECT department, COUNT(*) AS encounters_30d
FROM gold.fct_encounters
WHERE encounter_date >= current_date - interval '30' day
GROUP BY department
ORDER BY encounters_30d DESC;`,
  },
  {
    name: 'DuckDB',
    status: 'available',
    description: 'Engineer\'s laptop. Same Iceberg tables, queried directly from S3 with the iceberg extension. Tiny ad-hoc joins without spinning up anything.',
    sample_query: `INSTALL iceberg;
LOAD iceberg;

SELECT *
FROM iceberg_scan('s3://clarity-odi-lake/gold/fct_payor_denied_claims/')
WHERE denial_reason_code IN ('CO-50','CO-97')
LIMIT 100;`,
  },
  {
    name: 'Trino',
    status: 'available',
    description: 'Federated engine that joins the lake to other relational sources (state Medicaid systems, hospital EHR replicas) without copying data first.',
    sample_query: `SELECT e.department, AVG(e.length_of_stay_days) AS avg_los
FROM iceberg.gold.fct_encounters e
JOIN postgres.medicaid.member_eligibility m
  ON m.member_id = e.patient_id
WHERE e.payor_class = 'Medicaid'
GROUP BY e.department;`,
  },
  {
    name: 'Spark',
    status: 'available',
    description: 'Distributed compute for ML training and large cohort joins. Reads the same Iceberg tables via the spark-iceberg runtime.',
    sample_query: `df = spark.read.format("iceberg")\\
  .load("gold.fct_encounters")
df.groupBy("payor_class", "department")\\
  .agg({"length_of_stay_days": "avg"})\\
  .show()`,
  },
];

const ENGINE_COLORS: Record<QueryEngine['name'], string> = {
  Snowflake: '#29b5e8',
  Athena:    '#b8975c',
  DuckDB:    '#0b2545',
  Trino:     '#1d4e89',
  Spark:     '#b45309',
};

// ─── Number formatters (local — Clarity's api/queries doesn't export these) ─

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatBytes(b: number): string {
  if (b >= 1_000_000_000) return `${(b / 1_000_000_000).toFixed(2)} GB`;
  if (b >= 1_000_000)     return `${(b / 1_000_000).toFixed(1)} MB`;
  if (b >= 1_000)         return `${(b / 1_000).toFixed(1)} KB`;
  return `${b} B`;
}

// =============================================================================
// Page
// =============================================================================

export default function ArchitecturePage() {
  const [activeEngine, setActiveEngine] = useState<QueryEngine>(ENGINES[0]);

  const byLayer = (l: 'bronze' | 'silver' | 'gold') => TABLES.filter((t) => t.database === l);
  const layerStats = (l: 'bronze' | 'silver' | 'gold') => {
    const t = byLayer(l);
    return { tables: t.length, rows: t.reduce((s, r) => s + r.rows, 0), bytes: t.reduce((s, r) => s + r.bytes, 0) };
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <div className="eyebrow mb-1">Open Data Infrastructure</div>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink-strong)]">
          One lake. Every engine. The whole patient story.
        </h1>
        <p className="mt-3 text-[var(--ink-muted)] max-w-3xl leading-relaxed">
          Clarity Health treats <em>storage</em>, <em>catalog</em>, and <em>compute</em> as three
          independently swappable layers. Iceberg is the storage spec. Glue is the catalog.
          Snowflake, Athena, DuckDB, Trino, and Spark can all read the same tables &mdash; no copy,
          no extract, no proprietary format between the EHR and the analyst.
        </p>
      </header>

      {/* ── Data Flow diagram ─────────────────────────────────────────────── */}
      <section className="clinical-card p-6 sm:p-8 mb-8" style={cardStyle}>
        <div className="eyebrow mb-1">Data Flow</div>
        <h2 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] mb-6">
          From Clarity EHR + four open sources to one governed gold layer
        </h2>

        <AliveMedallion
          sources={CLARITY_SOURCES}
          bronze={{ ...layerStats('bronze'), trend: [180, 195, 210, 222, 240, 255, 270] }}
          silver={{ ...layerStats('silver'), trend: [120, 130, 142, 155, 168, 180, 192] }}
          gold={{   ...layerStats('gold'),   trend: [80, 88, 95, 104, 112, 124, 138] }}
          engines={CLARITY_ENGINES}
          accent="#0d9488"
        />

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--ink-muted)]">
          <LayerDetail layer="bronze" stats={layerStats('bronze')} desc="Raw rows landed by Fivetran. 1:1 with source. CDC kept current within five minutes." />
          <LayerDetail layer="silver" stats={layerStats('silver')} desc="Conformed dims and facts. Cleaned, deduped, joined to a patient + encounter spine." />
          <LayerDetail layer="gold"   stats={layerStats('gold')}   desc="Business-ready marts + the dbt semantic layer. What every clinician-facing surface reads." />
        </div>
      </section>

      {/* ── Multi-engine showcase ────────────────────────────────────────── */}
      <section className="clinical-card overflow-hidden mb-8" style={cardStyle}>
        <header className="clinical-card-header" style={cardHeaderStyle}>
          <div className="eyebrow">Compute is a choice</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            Same Iceberg tables. Five engines. One query at a time.
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Pick a query engine &mdash; the SQL barely changes, but the operational, cost, and
            governance profile shifts dramatically. That choice belongs to the hospital, not the vendor.
          </p>
        </header>

        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {ENGINES.map((e) => (
            <button
              key={e.name}
              onClick={() => setActiveEngine(e)}
              className="px-3 py-2 rounded-sm text-xs font-semibold uppercase tracking-wider border transition-all"
              style={
                activeEngine.name === e.name
                  ? { background: ENGINE_COLORS[e.name], borderColor: ENGINE_COLORS[e.name], color: '#ffffff' }
                  : { background: '#ffffff', color: 'var(--ink-muted)', borderColor: 'var(--hairline)' }
              }
            >
              {e.name}
              {e.status === 'active' && <span className="ml-1.5 text-[9px] opacity-80">● ACTIVE</span>}
              {e.status === 'demo'   && <span className="ml-1.5 text-[9px] opacity-60">DEMO</span>}
            </button>
          ))}
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">Query</div>
            <pre className="rounded-sm p-4 text-[11.5px] leading-relaxed overflow-x-auto font-mono" style={{ background: '#0b2545', color: 'var(--paper,#fefaf3)' }}>
              <code>{activeEngine.sample_query}</code>
            </pre>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2">Why this engine</div>
            <p className="text-sm text-[var(--ink)] leading-relaxed">{activeEngine.description}</p>
            <div className="mt-4 pt-4 border-t border-[var(--hairline-soft,#e8e4d8)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">Status</div>
              <div className="text-sm font-semibold" style={{ color: activeEngine.status === 'active' ? '#16a34a' : '#6b7280' }}>
                {activeEngine.status === 'active' ? '● Primary engine — powers this site' : 'Compatible and ready to wire in'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Iceberg catalog ──────────────────────────────────────────────── */}
      <section className="clinical-card overflow-hidden mb-8" style={cardStyle}>
        <header className="clinical-card-header" style={cardHeaderStyle}>
          <div className="eyebrow">Iceberg Catalog</div>
          <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
            Every table on the lake, registered in AWS Glue
          </h2>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            Open metadata. Every engine reads the same schema, the same partition layout, the same
            row counts &mdash; without anyone owning the "source of truth" exclusively.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
            <thead className="border-b border-[var(--hairline)]" style={{ background: 'var(--paper-deep,#f4efe2)' }}>
              <tr>
                <Th>Layer</Th>
                <Th>Table</Th>
                <Th>Source</Th>
                <Th align="right">Rows</Th>
                <Th align="right">Size</Th>
                <Th align="right">Columns</Th>
                <Th>Partitions</Th>
                <Th align="right">Updated</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hairline-soft,#e8e4d8)]">
              {TABLES.map((t) => (
                <tr key={`${t.database}.${t.table}`} className="hover:bg-[var(--paper-deep,#f4efe2)] cursor-default">
                  <td className="px-4 py-2.5"><LayerChip layer={t.database} /></td>
                  <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--ink-strong)]">{t.table}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-muted)] font-mono">{t.source_system}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[var(--ink-strong)]">{formatNumber(t.rows)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--ink)]">{formatBytes(t.bytes)}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--ink-muted)]">{t.schema_columns}</td>
                  <td className="px-4 py-2.5 text-xs text-[var(--ink-muted)] font-mono">
                    {t.partitions.length ? t.partitions.join(', ') : <span className="text-[var(--ink-soft)]">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-[var(--ink-muted)] font-mono">
                    {new Date(t.last_updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Data Quality — dbt Labs ──────────────────────────────────────── */}
      <section className="clinical-card overflow-hidden mb-8" style={cardStyle}>
        <header className="clinical-card-header flex items-start justify-between gap-4" style={cardHeaderStyle}>
          <div>
            <div className="eyebrow" style={{ color: '#FF694A' }}>Data Quality · dbt Labs</div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)] mt-0.5">
              Every table tested. Every run. Same lake.
            </h2>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              Tests defined in dbt Labs run on every build, against the same Iceberg tables every
              engine reads. Failures block promotion to the next layer &mdash; bad data never
              reaches the floor.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shrink-0" style={{ background: '#FF694A' }}>
            dbt Labs
          </div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--hairline-soft,#e8e4d8)]">
          {[
            { layer: 'bronze' as const, tests: 22, passing: 22, monitors: ['freshness', 'volume', 'schema drift'],                                 color: '#b45309' },
            { layer: 'silver' as const, tests: 58, passing: 57, monitors: ['nulls', 'uniqueness', 'referential', 'accepted values'],               color: '#6b7280' },
            { layer: 'gold'   as const, tests: 41, passing: 41, monitors: ['HIPAA-redacted PII', 'cohort cardinality', 'payor reconciliation'],    color: '#b8975c' },
          ].map((q) => {
            const ok = q.passing === q.tests;
            return (
              <div key={q.layer} className="p-5">
                <div className="flex items-center justify-between">
                  <LayerChip layer={q.layer} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ok ? '#16a34a' : '#dc2626' }}>
                    {ok ? '● all passing' : `● ${q.tests - q.passing} warn`}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <div className="font-serif text-3xl font-semibold text-[var(--ink-strong)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {q.passing}<span className="text-[var(--ink-soft)]">/{q.tests}</span>
                  </div>
                  <div className="text-xs text-[var(--ink-muted)]">tests · last run 12m ago</div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-[var(--ink-muted)]">
                  {q.monitors.map((m) => (
                    <li key={m} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: q.color }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="px-5 py-3 border-t border-[var(--hairline-soft,#e8e4d8)] flex items-center justify-between text-[11px] text-[var(--ink-soft)]" style={{ background: 'var(--paper-deep,#f4efe2)' }}>
          <span className="font-mono">121 tests · 120 passing · 1 warn · 0 errors</span>
          <span className="uppercase tracking-wider font-semibold">dbt build · merged into Fivetran</span>
        </div>
      </section>

      {/* ── ODI vs MDS comparison ────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="clinical-card p-6 border-l-4" style={{ ...cardStyle, borderLeftColor: 'var(--ink-soft)' }}>
          <div className="eyebrow" style={{ color: 'var(--ink-soft)' }}>Modern Data Stack</div>
          <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink-strong)]">Warehouse at the centre</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[var(--ink-muted)]">
            {[
              'Proprietary internal table format',
              'Warehouse vendor controls storage + compute',
              'Schema changes require migrations',
              'AI / ML access requires copying to another store',
              'Lock-in by design; switching is a multi-quarter project',
            ].map((s) => (
              <li key={s} className="flex items-start gap-2"><span className="text-[var(--ink-soft)] mt-0.5">▸</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
        <div className="clinical-card p-6 border-l-4" style={{ ...cardStyle, borderLeftColor: '#b8975c' }}>
          <div className="eyebrow">Open Data Infrastructure</div>
          <h3 className="mt-1 font-serif text-xl font-semibold text-[var(--ink-strong)]">Standards at the centre</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-[var(--ink)]">
            {[
              'Apache Iceberg — open table spec, multi-engine native',
              'Storage (S3) and compute (Snowflake, Athena, …) decoupled, billed separately',
              'Schema evolution is a table operation, not a migration',
              'AI agents read the lake directly via the Glue catalog',
              'Engines are interchangeable. Lock-in is an architectural choice — and Clarity didn\'t make it.',
            ].map((s) => (
              <li key={s} className="flex items-start gap-2"><span className="mt-0.5" style={{ color: '#b8975c' }}>●</span><span>{s}</span></li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Helpers — shared styles + sub-components
// =============================================================================

const cardStyle = {
  background: '#ffffff',
  border: '1px solid var(--hairline, #d9d3c4)',
  borderRadius: '4px',
};

const cardHeaderStyle = {
  padding: '20px',
  borderBottom: '1px solid var(--hairline-soft, #e8e4d8)',
};

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)] ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function LayerChip({ layer }: { layer: 'bronze' | 'silver' | 'gold' }) {
  const styles: Record<typeof layer, { bg: string; fg: string; border: string }> = {
    bronze: { bg: '#fef3c7', fg: '#92400e', border: '#b45309' },
    silver: { bg: '#f3f4f6', fg: '#374151', border: '#6b7280' },
    gold:   { bg: '#faf3e1', fg: '#7a5e2d', border: '#b8975c' },
  };
  const s = styles[layer];
  return (
    <span className="inline-block text-[9px] font-bold uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-sm border"
          style={{ background: s.bg, color: s.fg, borderColor: s.border }}>
      {layer}
    </span>
  );
}

function LayerDetail({ layer, stats, desc }: { layer: 'bronze' | 'silver' | 'gold'; stats: { tables: number; rows: number; bytes: number }; desc: string }) {
  return (
    <div className="border border-[var(--hairline,#d9d3c4)] rounded-sm p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <LayerChip layer={layer} />
        <span className="text-[10px] text-[var(--ink-soft)] font-mono">{stats.tables} table{stats.tables === 1 ? '' : 's'}</span>
      </div>
      <div className="text-sm font-bold text-[var(--ink-strong)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatNumber(stats.rows)} rows · {formatBytes(stats.bytes)}
      </div>
      <div className="text-[11px] text-[var(--ink-muted)] mt-1 leading-snug">{desc}</div>
    </div>
  );
}
