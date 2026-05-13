import { useMemo, useState } from 'react';
import { formatCurrency } from '../api/queries';

interface Props {
  totalCharges: number;
  encounters: number;
  payerHint?: string | null;
}

// Healthcare equivalent of the sheetz "tax estimator." Projects out-of-pocket
// cost for the next year based on encounter frequency, plan type, and copay
// estimates. All numbers are illustrative — production would pull them from
// the patient's coverage records.
const PLAN_DEFAULTS: Record<string, { coverage: number; copay: number; deductible: number }> = {
  'UPMC Health Plan': { coverage: 0.82, copay: 30, deductible: 1500 },
  'Highmark BCBS':    { coverage: 0.80, copay: 35, deductible: 2000 },
  'Aetna':            { coverage: 0.78, copay: 40, deductible: 2500 },
  'Cigna':            { coverage: 0.79, copay: 35, deductible: 2200 },
  'Medicare':         { coverage: 0.80, copay: 20, deductible: 1632 },
  'Medicaid':         { coverage: 0.95, copay: 4,  deductible: 0 },
  'Self-pay':         { coverage: 0.00, copay: 0,  deductible: 0 },
};

export default function CareCostEstimator({ totalCharges, encounters, payerHint }: Props) {
  const initialPlan = payerHint && PLAN_DEFAULTS[payerHint] ? payerHint : 'UPMC Health Plan';
  const [plan, setPlan] = useState(initialPlan);
  const [advanced, setAdvanced] = useState(false);
  const [coverage, setCoverage] = useState(PLAN_DEFAULTS[initialPlan].coverage);
  const [copay, setCopay] = useState(PLAN_DEFAULTS[initialPlan].copay);
  const [deductible, setDeductible] = useState(PLAN_DEFAULTS[initialPlan].deductible);
  const [futureVisits, setFutureVisits] = useState(Math.max(encounters, 6));

  const onPlanChange = (p: string) => {
    setPlan(p);
    const d = PLAN_DEFAULTS[p];
    setCoverage(d.coverage);
    setCopay(d.copay);
    setDeductible(d.deductible);
  };

  const projection = useMemo(() => {
    const avgPerVisit = encounters > 0 ? totalCharges / encounters : 350;
    const billed = avgPerVisit * futureVisits;
    const afterDeductible = Math.max(0, billed - deductible);
    const insurance = afterDeductible * coverage;
    const copayTotal = futureVisits * copay;
    const oop = deductible + (afterDeductible - insurance) + copayTotal;
    return { avgPerVisit, billed, insurance, oop, copayTotal };
  }, [totalCharges, encounters, futureVisits, deductible, coverage, copay]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Annual care-cost projection</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Estimates this patient's out-of-pocket spend for the next 12 months based on visit
            frequency and plan coverage. Defaults from the primary payer on file.
          </p>
        </div>
        <button onClick={() => setAdvanced((v) => !v)} className="text-xs text-brand-700 hover:text-brand-900 font-medium">
          {advanced ? 'Hide assumptions' : 'Adjust assumptions'}
        </button>
      </div>

      <div className="rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 text-white p-5 mb-4">
        <div className="text-[11px] uppercase tracking-wider text-brand-200 font-medium">Estimated out-of-pocket / year</div>
        <div className="mt-1 text-3xl sm:text-4xl font-bold tabular-nums">{formatCurrency(projection.oop)}</div>
        <div className="mt-1 text-xs text-brand-200">
          On {formatCurrency(projection.billed)} billed · insurance covers {formatCurrency(projection.insurance)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <Slice label="Deductible" value={deductible} accent="bg-rose-100 text-rose-700" />
        <Slice label="Coinsurance" value={projection.billed - projection.insurance - deductible - projection.copayTotal} accent="bg-amber-100 text-amber-700" />
        <Slice label="Copays" value={projection.copayTotal} accent="bg-brand-100 text-brand-700" />
      </div>

      {advanced && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100">
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Plan</span>
            <select
              value={plan}
              onChange={(e) => onPlanChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.keys(PLAN_DEFAULTS).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <NumInput label="Projected visits / yr" value={futureVisits} onChange={setFutureVisits} step={1} />
          <NumInput label="Coverage %" value={Math.round(coverage * 100)} onChange={(n) => setCoverage(n / 100)} step={1} />
          <NumInput label="Copay / visit ($)" value={copay} onChange={setCopay} step={5} />
          <NumInput label="Deductible ($)" value={deductible} onChange={setDeductible} step={100} />
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400 leading-snug">
        Estimate only — actual costs depend on the patient's exact benefit design, network
        utilization, and any supplemental coverage.
      </p>
    </section>
  );
}

function Slice({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className={`inline-flex text-[10px] uppercase tracking-wider font-medium rounded-full px-2 py-0.5 ${accent}`}>{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900 tabular-nums">{formatCurrency(Math.max(0, value))}</div>
    </div>
  );
}

function NumInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm tabular-nums"
      />
    </label>
  );
}
