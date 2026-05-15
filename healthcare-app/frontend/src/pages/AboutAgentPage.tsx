import { useNavigate } from 'react-router-dom';

export default function AboutAgentPage() {
  const navigate = useNavigate();
  return (
    <div className="bg-slate-50">
      <section className="bg-gradient-to-br from-teal-800 via-cyan-700 to-sky-600 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-xs font-medium uppercase tracking-wider mb-5">
            ✨ Clinical Insight Agent
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-3xl">
            Skip the BI tool. Just ask.
          </h1>
          <p className="mt-5 text-lg text-cyan-50 max-w-2xl">
            A natural-language layer on top of the same Snowflake gold tables the rest of the demo
            uses. Type a question — get back a table, a chart, and a short summary.
          </p>
          <button
            onClick={() => navigate('/agent')}
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-white text-teal-700 px-6 py-3.5 text-base font-semibold shadow-lg hover:bg-cyan-50"
          >
            Open the agent <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">How it works</h2>
        <div className="space-y-4 text-slate-700">
          <p>
            The agent runs entirely client-side over the published JSON snapshot of the Snowflake
            marts. A small intent classifier recognizes patterns like "3+ chronic conditions",
            "highest-charge patients", "patients in ZIP …", and free-text name/MRN lookups, then
            executes the matching aggregation in your browser.
          </p>
          <p>
            No backend, no API key required. The snapshot is a daily export from
            <code className="font-mono text-sm bg-slate-100 px-1 mx-1 rounded">
              JASON_CHLETSOS_EPIC.CLINICAL.*
            </code>
            and <code className="font-mono text-sm bg-slate-100 px-1 mx-1 rounded">FINANCIAL.*</code>
            via <code className="font-mono text-sm bg-slate-100 px-1 mx-1 rounded">scripts/build_snapshot.py</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
