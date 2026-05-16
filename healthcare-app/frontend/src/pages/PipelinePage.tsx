// Pipeline — the booth's "how it works" moment.
//
// Replaces the earlier 4-card failure-toggle demo with a Mission-Control style
// observability surface: animated data-flow diagram, KPI strip, connector
// health table with sparklines, dbt model grid, and Snowflake-native callouts
// (Time Travel, zero-copy clones, Cortex). Every minute of pipeline lag is
// framed as denied-claim risk and ED throughput drag — ties the data
// infrastructure to the CEO P&L on the Executive page.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkline } from '../components/Sparkline';
import { DataFlowDiagram, KpiTile, AnimatedCounter, type FlowNode } from '../components/Executive';

interface Connector {
  table: string;
  schema: string;
  rowsCdc: number;
  lagSec: number;
  status: 'healthy' | 'caution' | 'alert';
  lastSyncMin: number;
  throughput: number[];
}

const CONNECTORS: Connector[] = [
  { table: 'PATIENT', schema: 'clarity', rowsCdc: 412, lagSec: 32, status: 'healthy', lastSyncMin: 4, throughput: [22, 18, 26, 31, 28, 24, 30, 34, 29, 27, 33, 38] },
  { table: 'PAT_ENC', schema: 'clarity', rowsCdc: 8214, lagSec: 41, status: 'healthy', lastSyncMin: 4, throughput: [380, 420, 460, 510, 540, 560, 510, 480, 530, 560, 590, 610] },
  { table: 'PAT_ENC_DX', schema: 'clarity', rowsCdc: 14288, lagSec: 48, status: 'healthy', lastSyncMin: 4, throughput: [620, 680, 710, 760, 820, 880, 840, 800, 860, 920, 980, 1040] },
  { table: 'HSP_ACCOUNT', schema: 'clarity', rowsCdc: 6480, lagSec: 39, status: 'healthy', lastSyncMin: 4, throughput: [240, 280, 310, 340, 360, 380, 360, 340, 380, 410, 440, 470] },
  { table: 'HSP_TRANSACTION', schema: 'clarity', rowsCdc: 22146, lagSec: 52, status: 'healthy', lastSyncMin: 4, throughput: [840, 920, 1010, 1080, 1140, 1200, 1180, 1160, 1220, 1280, 1340, 1410] },
  { table: 'MEDICATIONS', schema: 'clarity', rowsCdc: 3024, lagSec: 36, status: 'healthy', lastSyncMin: 4, throughput: [110, 130, 150, 170, 180, 190, 200, 210, 220, 230, 240, 252] },
  { table: 'PROVIDERS', schema: 'clarity', rowsCdc: 24, lagSec: 18, status: 'healthy', lastSyncMin: 4, throughput: [1, 2, 1, 0, 3, 1, 2, 1, 2, 1, 0, 2] },
  { table: 'DEPARTMENTS', schema: 'clarity', rowsCdc: 6, lagSec: 14, status: 'healthy', lastSyncMin: 4, throughput: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0] },
];

const DBT_MODELS = [
  { layer: 'staging', name: 'stg_clarity__patient', rows: 14820, ms: 380, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__pat_enc', rows: 184220, ms: 1240, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__pat_enc_dx', rows: 412380, ms: 1860, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__hsp_account', rows: 184220, ms: 920, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__hsp_transaction', rows: 814220, ms: 2240, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__medications', rows: 86420, ms: 720, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__providers', rows: 1820, ms: 180, status: 'pass' },
  { layer: 'staging', name: 'stg_clarity__departments', rows: 86, ms: 90, status: 'pass' },
  { layer: 'intermediate', name: 'int_patient_encounter_spine', rows: 184220, ms: 2840, status: 'pass' },
  { layer: 'intermediate', name: 'int_chronic_conditions', rows: 41280, ms: 1620, status: 'pass' },
  { layer: 'intermediate', name: 'int_encounter_diagnoses', rows: 412380, ms: 2410, status: 'pass' },
  { layer: 'intermediate', name: 'int_financials', rows: 814220, ms: 3120, status: 'pass' },
  { layer: 'mart',         name: 'dim_patients', rows: 14820, ms: 480, status: 'pass' },
  { layer: 'mart',         name: 'dim_providers', rows: 1820, ms: 210, status: 'pass' },
  { layer: 'mart',         name: 'dim_departments', rows: 86, ms: 110, status: 'pass' },
  { layer: 'mart',         name: 'fct_encounters', rows: 184220, ms: 1840, status: 'pass' },
  { layer: 'mart',         name: 'fct_diagnoses', rows: 412380, ms: 2380, status: 'pass' },
  { layer: 'mart',         name: 'fct_account_summary', rows: 184220, ms: 1620, status: 'pass' },
];

export default function PipelinePage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const flow: FlowNode[] = useMemo(
    () => [
      { id: 'epic', logo: 'epic', label: 'Epic Clarity', sub: 'SQL Server · CDC source', status: 'healthy', metric: '8 tables · 2.4M rows' },
      { id: 'fivetran', logo: 'fivetran', label: 'Fivetran', sub: 'TELEPORT CDC connector', status: 'healthy', metric: '5-min cadence · 99.7% SLA' },
      { id: 'snowflake', logo: 'snowflake', label: 'Snowflake', sub: 'JASON_CHLETSOS_EPIC', status: 'healthy', metric: 'XS warehouse · auto-suspend' },
      { id: 'dbt', logo: 'dbt', label: 'dbt transforms', sub: '21 models · 4 schemas', status: 'healthy', metric: '24s avg · 0 failures' },
      { id: 'app', logo: 'app', label: 'Clarity App', sub: 'React · static JSON', status: 'healthy', metric: 'CDN · 12 min deploy' },
    ],
    [],
  );

  const totalRowsCdc = CONNECTORS.reduce((s, c) => s + c.rowsCdc, 0);
  const maxLag = Math.max(...CONNECTORS.map((c) => c.lagSec));
  const healthyCount = CONNECTORS.filter((c) => c.status === 'healthy').length;

  return (
    <>
      <section className="bg-white border-b border-[var(--hairline)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-2">Pipeline · Observability</div>
              <h1 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight text-[var(--ink-strong)] tracking-tight">
                Epic Clarity → Snowflake, end-to-end
              </h1>
              <p className="mt-2 text-sm text-[var(--ink-muted)] max-w-3xl leading-relaxed">
                Fivetran captures change-data from Epic Clarity's SQL Server source and lands it in
                Snowflake every 5 minutes. dbt transforms it into the staging, intermediate, clinical,
                and financial marts that power the Executive Cockpit, patient registry, and population
                health surfaces. Every minute of lag has a P&L cost — see <Link to="/executive" className="underline text-[var(--clinical-teal)]">Executive</Link>.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono tabular text-[var(--ink-soft)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--clinical-green)] animate-pulse" />
              All systems operational · refreshed {(tick * 4) % 60}s ago
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero data-flow */}
        <DataFlowDiagram nodes={flow} />

        {/* KPI strip — pipeline health framed in business terms */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile
              label="End-to-end freshness"
              value={<AnimatedCounter to={4.2} format={(n) => `${n.toFixed(1)} min`} />}
              delta={{ value: '99.7% SLA', trend: 'good', vs: 'rolling 30d' }}
              spark={[7.2, 6.8, 6.4, 6.1, 5.8, 5.4, 5.1, 4.9, 4.6, 4.4, 4.3, 4.2]}
              dollarLever="Sub-5-min replication is the operational floor for real-time denial recovery and ED throughput."
              badge="Fivetran CDC"
              badgeTone="info"
              highlight
            />
            <KpiTile
              label="Rows replicated · 24h"
              value="2.42M"
              delta={{ value: '+ 4.1%', trend: 'good', vs: 'vs prior day' }}
              spark={[1.9, 2.0, 2.1, 2.05, 2.15, 2.25, 2.20, 2.18, 2.30, 2.32, 2.38, 2.42]}
              dollarLever="TELEPORT incremental sync transfers only changed rows — ~98% bandwidth savings vs full re-sync."
            />
            <KpiTile
              label="Snowflake compute · 7d"
              value="$1,120"
              subValue="XS warehouse · auto-suspend"
              delta={{ value: '− 96%', trend: 'good', vs: 'vs legacy DW' }}
              spark={[2150, 1980, 1820, 1640, 1500, 1380, 1290, 1220, 1180, 1150, 1130, 1120]}
              dollarLever="Auto-suspend + zero-copy clones eliminate idle spend. Legacy on-prem warehouse: $1.6M/yr fixed."
              badge="Snowflake"
              badgeTone="info"
            />
            <KpiTile
              label="dbt incremental build"
              value="24s"
              subValue="21 models · 0 failures"
              delta={{ value: '21 / 21', trend: 'good', vs: 'tests passing' }}
              spark={[42, 38, 36, 34, 32, 30, 28, 27, 26, 25, 24, 24]}
              dollarLever="Tests catch broken denial logic, double-counted revenue, and orphan patient IDs before they reach the CEO dashboard."
            />
          </div>
        </section>

        {/* Connector health table */}
        <section className="clinical-card overflow-hidden">
          <div className="clinical-card-header flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow">Connector Health · last 24h</div>
              <div className="mt-0.5 font-serif text-lg font-semibold text-[var(--ink-strong)]">
                8 Epic Clarity tables · CDC streaming
              </div>
            </div>
            <div className="text-right text-[11px] tabular text-[var(--ink-soft)]">
              <div>
                <span className="text-[var(--clinical-green)] font-semibold">{healthyCount}</span>
                <span> healthy</span>
                <span className="mx-1">·</span>
                <span className="text-[var(--ink-strong)] font-semibold tabular">{(totalRowsCdc).toLocaleString()}</span>
                <span> rows synced</span>
              </div>
              <div className="text-[10px]">Max lag {maxLag}s · all under 60s SLA</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] bg-[var(--paper-deep)] border-b border-[var(--hairline-soft)]">
                <tr>
                  <th className="text-left font-semibold px-5 py-2.5">Source table</th>
                  <th className="text-right font-semibold px-3 py-2.5">Rows · 24h CDC</th>
                  <th className="text-left font-semibold px-3 py-2.5">Throughput</th>
                  <th className="text-right font-semibold px-3 py-2.5">Lag</th>
                  <th className="text-right font-semibold px-3 py-2.5">Last sync</th>
                  <th className="text-right font-semibold px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hairline-soft)] tabular">
                {CONNECTORS.map((c) => (
                  <tr key={c.table} className="hover:bg-[var(--paper-deep)] transition-colors">
                    <td className="px-5 py-2.5">
                      <div className="font-mono text-[12px] text-[var(--ink-strong)] font-semibold">{c.table}</div>
                      <div className="text-[10px] text-[var(--ink-soft)] tracking-wider uppercase">{c.schema}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.rowsCdc.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <Sparkline values={c.throughput} width={100} height={22} stroke="var(--clinical-teal)" fill="var(--clinical-teal)" />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.lagSec}s</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[var(--ink-soft)]">{c.lastSyncMin}m ago</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`status-pill ${c.status}`}>{c.status === 'healthy' ? 'live' : c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Snowflake-native callouts — the tight-integration story */}
        <section>
          <div className="mb-4">
            <div className="eyebrow mb-1">Snowflake · why this is different</div>
            <h2 className="font-serif text-xl font-semibold text-[var(--ink-strong)]">
              Capabilities that don't exist on a legacy data warehouse
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SnowCard
              tag="Zero-Copy Clone"
              title="Instant dev/test environments"
              body="Clone JASON_CHLETSOS_EPIC in < 1 second with no storage duplication. Analysts test new denial logic against full production data without copying a single byte."
              metric="< 1 s"
              metricLabel="clone time"
            />
            <SnowCard
              tag="Time Travel"
              title="Recover anything, point-in-time"
              body="Query any mart as-of any timestamp inside the retention window (up to 90 days on Enterprise). Restore a dropped table, audit how a CMI calc has drifted, or reconcile a closed period with one SQL clause."
              metric="≤ 90 d"
              metricLabel="retention window"
            />
            <SnowCard
              tag="Cortex · LLM"
              title="Cohort questions in plain English"
              body="Clinical Insights routes natural-language questions to Cortex when the rule engine can't match. Snowflake-native — no data leaves the account boundary."
              metric="in-account"
              metricLabel="model inference"
            />
            <SnowCard
              tag="Auto-Suspend"
              title="Pay only for query seconds"
              body="The XS transform warehouse runs ~1.4 min per Fivetran load and then suspends. Annualized Snowflake compute under $60K vs $1.6M/yr fixed on the prior on-prem warehouse — a 96% cost reduction."
              metric="96%"
              metricLabel="compute saved"
            />
          </div>
        </section>

        {/* dbt model grid */}
        <section className="clinical-card overflow-hidden">
          <div className="clinical-card-header flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="eyebrow">dbt build · last run</div>
              <div className="mt-0.5 font-serif text-lg font-semibold text-[var(--ink-strong)]">
                21 models · staging → intermediate → marts
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11px] tabular text-[var(--ink-soft)]">
              <span><span className="font-semibold text-[var(--clinical-green)]">100%</span> tests passing</span>
              <span><span className="font-semibold text-[var(--ink-strong)]">24s</span> total runtime</span>
              <span><span className="font-semibold text-[var(--ink-strong)]">{DBT_MODELS.reduce((s, m) => s + m.rows, 0).toLocaleString()}</span> rows built</span>
            </div>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['staging', 'intermediate', 'mart'] as const).map((layer) => {
              const models = DBT_MODELS.filter((m) => m.layer === layer);
              const tone = layer === 'staging' ? 'var(--clinical-teal)' : layer === 'intermediate' ? 'var(--clinical-violet)' : 'var(--color-brand-700)';
              return (
                <div key={layer} className="rounded-md border border-[var(--hairline)] bg-white p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: tone }}>
                      {layer === 'mart' ? 'Marts (clinical + financial)' : layer}
                    </div>
                    <div className="font-mono text-[11px] tabular text-[var(--ink-soft)]">{models.length} models</div>
                  </div>
                  <ul className="space-y-1">
                    {models.map((m) => (
                      <li key={m.name} className="flex items-center justify-between gap-3 text-[12px] py-1 border-b border-[var(--hairline-soft)] last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--clinical-green)' }} />
                          <span className="font-mono truncate text-[var(--ink-strong)]">{m.name}</span>
                        </div>
                        <div className="text-right tabular shrink-0">
                          <div className="font-mono text-[11px] text-[var(--ink-strong)]">{m.rows.toLocaleString()}</div>
                          <div className="font-mono text-[10px] text-[var(--ink-soft)]">{m.ms}ms</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Business-impact bridge — the line every CEO will recognize */}
        <section className="rounded-lg border p-6 sm:p-8" style={{ borderColor: 'var(--clinical-teal)', background: 'linear-gradient(135deg, #ffffff 0%, var(--clinical-teal-bg) 160%)' }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-7">
              <div className="eyebrow mb-2">Why the pipeline is a CFO line-item</div>
              <h3 className="font-serif text-2xl font-semibold text-[var(--ink-strong)] leading-tight">
                Data freshness <em>is</em> denial recovery.
              </h3>
              <p className="mt-3 text-sm text-[var(--ink-muted)] leading-relaxed max-w-2xl">
                Every minute Epic Clarity changes don't reach the marts, denial-prevention workflows
                miss timely-filing windows, ED capacity dashboards run on stale census, and CDM updates
                lag clinician documentation. A 4-minute Fivetran → Snowflake replication SLA isn't an
                infrastructure brag — it's the floor for real-time revenue cycle and capacity decisions.
              </p>
            </div>
            <div className="md:col-span-5 grid grid-cols-2 gap-3">
              <ImpactStat value="$8M" label="Per 1-pt denial reduction" />
              <ImpactStat value="$2.7M" label="Per 1-day AR reduction" />
              <ImpactStat value="$1.8M" label="Per 1-hr ED-board cut" />
              <ImpactStat value="$1.6M" label="Legacy DW retired · annual" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function SnowCard({
  tag, title, body, metric, metricLabel,
}: { tag: string; title: string; body: string; metric: string; metricLabel: string }) {
  return (
    <div className="clinical-card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-bold text-white tracking-tight" style={{ background: '#29B5E8' }}>❄</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--clinical-teal)] font-semibold">{tag}</span>
      </div>
      <div className="font-serif text-base font-semibold text-[var(--ink-strong)] leading-snug">{title}</div>
      <p className="mt-2 text-[12px] text-[var(--ink-muted)] leading-relaxed flex-1">{body}</p>
      <div className="mt-4 pt-3 border-t border-[var(--hairline-soft)]">
        <div className="font-serif text-2xl font-semibold text-[var(--ink-strong)] tabular leading-none">{metric}</div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mt-1">{metricLabel}</div>
      </div>
    </div>
  );
}

function ImpactStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-[var(--hairline)] bg-white p-3">
      <div className="font-serif text-2xl font-semibold text-[var(--clinical-green)] tabular leading-none">{value}</div>
      <div className="text-[11px] text-[var(--ink-muted)] mt-1.5 leading-snug">{label}</div>
    </div>
  );
}
