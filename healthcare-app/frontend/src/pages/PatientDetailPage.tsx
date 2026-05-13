import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatCurrency, formatNumber } from '../api/queries';
import type {
  PatientDetail,
  EncountersResponse,
  DiagnosesResponse,
  AccountsResponse,
  ComparablesResponse,
} from '../types';

export default function PatientDetailPage() {
  const { patId = '' } = useParams();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [encounters, setEncounters] = useState<EncountersResponse | null>(null);
  const [diagnoses, setDiagnoses] = useState<DiagnosesResponse | null>(null);
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [comparables, setComparables] = useState<ComparablesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getPatient(patId),
      api.getEncounters(patId),
      api.getDiagnoses(patId),
      api.getAccounts(patId),
      api.getComparables(patId),
    ])
      .then(([p, e, d, a, c]) => {
        setPatient(p);
        setEncounters(e);
        setDiagnoses(d);
        setAccounts(a);
        setComparables(c);
      })
      .finally(() => setLoading(false));
  }, [patId]);

  if (loading || !patient) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-slate-500">Loading patient…</div>;
  }

  const balance = accounts?.summary.outstanding_balance ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-teal-700">Home</Link> /{' '}
        <Link to="/patients" className="hover:text-teal-700">Patients</Link> /{' '}
        <span className="text-slate-700">{patient.med_rec_num}</span>
      </nav>

      <header className="rounded-2xl bg-gradient-to-br from-teal-700 to-teal-900 text-white p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-teal-200 font-mono">
              MRN {patient.med_rec_num} · pat_id {patient.pat_id}
            </div>
            <h1 className="mt-1 text-3xl sm:text-4xl font-bold">{patient.full_name}</h1>
            <div className="mt-1 text-teal-100">
              {patient.age} y/o · {patient.sex} · DOB {patient.birth_date}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {patient.city && <Pill>{patient.city}{patient.zip_code ? `, ${patient.zip_code}` : ''}</Pill>}
              {patient.race && <Pill>{patient.race}</Pill>}
              {patient.primary_care_provider && <Pill>PCP: {patient.primary_care_provider}</Pill>}
              {patient.active_chronic_count > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-500/30 px-2.5 py-0.5">
                  {patient.active_chronic_count} chronic condition{patient.active_chronic_count === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <HeroStat label="Encounters" value={formatNumber(encounters?.encounters.length ?? 0)} />
            <HeroStat label="Diagnoses" value={formatNumber(diagnoses?.diagnoses.length ?? 0)} />
            <HeroStat label="Outstanding" value={formatCurrency(balance)} />
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent encounters</h2>
          {encounters && encounters.encounters.length > 0 ? (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="min-w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="px-2 py-2 text-left">Department</th>
                    <th className="px-2 py-2 text-left">Provider</th>
                    <th className="px-2 py-2 text-right">Charges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {encounters.encounters.map((e) => (
                    <tr key={e.pat_enc_csn_id}>
                      <td className="px-2 py-2 text-slate-700">{e.contact_date}</td>
                      <td className="px-2 py-2 text-slate-700">{e.encounter_type}</td>
                      <td className="px-2 py-2 text-slate-500">{e.department_name}</td>
                      <td className="px-2 py-2 text-slate-500">{e.provider_name}</td>
                      <td className="px-2 py-2 text-right text-slate-900">{formatCurrency(e.total_charges)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No encounters recorded.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Active diagnoses</h2>
          {diagnoses && diagnoses.diagnoses.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {diagnoses.diagnoses.map((d) => (
                <li key={d.dx_id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 last:border-0">
                  <div>
                    <div className="text-slate-900 font-medium">{d.diagnosis_name}</div>
                    <div className="text-xs font-mono text-slate-500">{d.icd10_code} · first {d.first_recorded}</div>
                  </div>
                  {d.chronic && <span className="text-[10px] uppercase tracking-wider bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">chronic</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No diagnoses recorded.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Hospital accounts</h2>
          {accounts && accounts.accounts.length > 0 ? (
            <div className="overflow-x-auto -mx-2 px-2">
              <table className="min-w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wider text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="px-2 py-2 text-left">Account</th>
                    <th className="px-2 py-2 text-left">Type</th>
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Payer</th>
                    <th className="px-2 py-2 text-right">Charges</th>
                    <th className="px-2 py-2 text-right">Payments</th>
                    <th className="px-2 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.accounts.map((a) => (
                    <tr key={a.hsp_account_id}>
                      <td className="px-2 py-2 text-xs font-mono text-slate-500">{a.hsp_account_id}</td>
                      <td className="px-2 py-2">{a.account_type}</td>
                      <td className="px-2 py-2">{a.status}</td>
                      <td className="px-2 py-2 text-slate-500">{a.primary_payer ?? '—'}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(a.total_charges)}</td>
                      <td className="px-2 py-2 text-right">{formatCurrency(a.total_payments)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatCurrency(a.current_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No accounts on file.</p>
          )}
        </section>

        {comparables && comparables.comparables.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Similar patient cohort</h2>
            <p className="text-sm text-slate-500 mb-3">Patients with overlapping chronic conditions and comparable age.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {comparables.comparables.map((c) => (
                <Link
                  key={c.pat_id}
                  to={`/patients/${encodeURIComponent(c.pat_id)}`}
                  className="text-left rounded-lg border border-slate-200 p-4 hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="font-medium text-slate-900">{c.full_name}</div>
                  <div className="text-xs text-slate-500">{c.age} y/o · {c.sex}</div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-teal-700 font-semibold">{c.encounter_count} visits</span>
                    <span className="text-xs text-rose-700">{c.chronic_overlap_count} chronic overlap</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-white">{children}</span>;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur-sm p-3">
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-teal-200">{label}</div>
      <div className="mt-1 text-base sm:text-lg lg:text-xl font-bold leading-tight">{value}</div>
    </div>
  );
}
