import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatNumber } from '../api/queries';
import type { PatientSearchResult } from '../types';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

type Mode = 'count' | 'charges' | 'chronic';
const MODE_META: Record<Mode, { label: string; pick: (p: PatientSearchResult) => number }> = {
  count:    { label: 'Patient count',          pick: () => 1 },
  charges:  { label: 'Median annual charges',  pick: (p) => p.total_charges },
  chronic:  { label: 'Median chronic count',   pick: (p) => p.active_chronic_count },
};

// Calm clinical-teal ramp for ZIP bubbles.
const RAMP = ['#cffafe', '#a5f3fc', '#67e8f9', '#0e7490', '#155e75'];

function median(vals: number[]): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function quantile(vals: number[], q: number): number {
  if (vals.length === 0) return 0;
  const s = [...vals].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

interface ZipAgg {
  zip: string;
  city: string;
  lat: number;
  lng: number;
  patients: PatientSearchResult[];
  count: number;
  medianCharges: number;
  medianChronic: number;
}

export default function MapPage() {
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('count');
  const [selectedZip, setSelectedZip] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.searchPatients({ limit: 200000 }).then((r) => setPatients(r.results)).finally(() => setLoading(false));
  }, []);

  const placed = useMemo(
    () => patients.filter((p) => p.latitude != null && p.longitude != null && p.zip_code),
    [patients],
  );

  const zipAggs: ZipAgg[] = useMemo(() => {
    const m = new Map<string, PatientSearchResult[]>();
    for (const p of placed) {
      const k = p.zip_code!;
      const list = m.get(k) ?? [];
      list.push(p);
      m.set(k, list);
    }
    return Array.from(m.entries()).map(([zip, rows]) => {
      const lat = rows.reduce((s, p) => s + (p.latitude ?? 0), 0) / rows.length;
      const lng = rows.reduce((s, p) => s + (p.longitude ?? 0), 0) / rows.length;
      const cityCounts = new Map<string, number>();
      for (const p of rows) cityCounts.set(p.city ?? '', (cityCounts.get(p.city ?? '') ?? 0) + 1);
      const city = Array.from(cityCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      return {
        zip, city, lat, lng,
        patients: rows,
        count: rows.length,
        medianCharges: median(rows.map((p) => p.total_charges)),
        medianChronic: median(rows.map((p) => p.active_chronic_count)),
      };
    });
  }, [placed]);

  const valueFor = (z: ZipAgg) =>
    mode === 'count' ? z.count : mode === 'charges' ? z.medianCharges : z.medianChronic;

  const breakpoints = useMemo(() => {
    const vals = zipAggs.map(valueFor);
    return [0.2, 0.4, 0.6, 0.8].map((q) => quantile(vals, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipAggs, mode]);

  const bucketIndex = (v: number) =>
    v < breakpoints[0] ? 0 : v < breakpoints[1] ? 1 : v < breakpoints[2] ? 2 : v < breakpoints[3] ? 3 : 4;

  const colorFor = (z: ZipAgg) => RAMP[bucketIndex(valueFor(z))];
  const radiusFor = (z: ZipAgg) => {
    const maxCount = Math.max(1, ...zipAggs.map((x) => x.count));
    return 8 + 28 * Math.sqrt(z.count / maxCount);
  };

  const selected = selectedZip ? zipAggs.find((z) => z.zip === selectedZip) ?? null : null;

  const fmt = (v: number) =>
    mode === 'count' ? formatNumber(v) :
    mode === 'charges' ? formatCurrency(v) :
    `${v.toFixed(1)} dx`;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-[var(--hairline)] bg-white px-4 sm:px-6 lg:px-8 py-3">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="eyebrow mb-0.5">Geographic</div>
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-[var(--ink-strong)] tracking-tight">
              {selected ? `ZIP ${selected.zip}` : 'Patient density map'}{' '}
              <span className="text-[var(--ink-soft)] text-sm font-normal font-sans">— {MODE_META[mode].label}</span>
            </h1>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              {loading
                ? 'Loading patients…'
                : selected
                ? `${formatNumber(selected.count)} patients in this ZIP. Click another ZIP or back out.`
                : `${formatNumber(zipAggs.length)} ZIPs · ${formatNumber(placed.length)} patients. Click any bubble to drill in.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected && (
              <button
                onClick={() => setSelectedZip(null)}
                className="rounded-md border border-[var(--hairline)] bg-white hover:bg-[var(--paper-deep)] text-[var(--ink)] text-xs font-medium px-3 py-1.5"
              >
                ← Back to ZIPs
              </button>
            )}
            <div className="flex flex-wrap gap-1 rounded-md border border-[var(--hairline)] bg-[var(--paper-deep)] p-1 text-xs">
              {(Object.keys(MODE_META) as Mode[]).map((m) => {
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded font-medium transition-colors ${
                      active
                        ? 'bg-white shadow-sm text-[var(--clinical-teal)] border border-[var(--clinical-teal)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink-strong)]'
                    }`}
                  >
                    {MODE_META[m].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        {zipAggs.length > 0 && (
          <MapContainer center={[40.4673, -80.0]} zoom={11} minZoom={9} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={19}
            />
            <FitOnEnter zipAggs={zipAggs} selected={selected} />
            {!selected &&
              zipAggs.map((z) => (
                <CircleMarker
                  key={z.zip}
                  center={[z.lat, z.lng]}
                  radius={radiusFor(z)}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: colorFor(z), fillOpacity: 0.78 }}
                  eventHandlers={{ click: () => setSelectedZip(z.zip) }}
                >
                  <Popup>
                    <div className="text-xs space-y-0.5">
                      <div className="font-mono text-[var(--ink-soft)]">ZIP {z.zip}</div>
                      <div className="font-serif font-semibold text-[var(--ink-strong)]">{z.city}</div>
                      <div className="mt-2 tabular">
                        <strong>Patients:</strong> {formatNumber(z.count)}
                      </div>
                      <div className="text-[var(--ink-muted)] tabular">
                        Median charges {formatCurrency(z.medianCharges)} · Median chronic dx {z.medianChronic}
                      </div>
                      <button onClick={() => setSelectedZip(z.zip)} className="mt-2 font-medium text-[var(--clinical-teal)] hover:text-[var(--ink-strong)]">
                        Drill into ZIP →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            {selected &&
              selected.patients.slice(0, 1500).map((p) => (
                <CircleMarker
                  key={p.pat_id}
                  center={[p.latitude!, p.longitude!]}
                  radius={4 + Math.min(7, p.active_chronic_count * 1.4)}
                  pathOptions={{
                    color: '#fff',
                    weight: 1,
                    fillColor: p.active_chronic_count >= 3 ? '#be123c' : p.active_chronic_count >= 1 ? '#b45309' : '#047857',
                    fillOpacity: 0.85,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-mono text-[var(--ink-soft)]">MRN {p.med_rec_num}</div>
                      <div className="font-serif font-semibold text-[var(--ink-strong)] mt-0.5">{p.full_name}</div>
                      <div className="text-[var(--ink-muted)] tabular">{p.age} y/o · {p.sex}</div>
                      <div className="mt-2 text-sm tabular">
                        <strong>{p.encounter_count} visits</strong> · {p.active_chronic_count} chronic
                      </div>
                      <button onClick={() => navigate(`/patients/${encodeURIComponent(p.pat_id)}`)} className="mt-2 font-medium text-[var(--clinical-teal)] hover:text-[var(--ink-strong)]">
                        Open patient →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        )}

        <div className="absolute bottom-4 right-4 z-[400] clinical-card p-3 text-xs max-w-[280px] bg-white/95 backdrop-blur">
          <div className="eyebrow mb-2">
            {selected ? 'Chronic burden' : MODE_META[mode].label + ' per ZIP'}
          </div>
          <div className="space-y-1.5">
            {selected ? (
              <>
                <LegendDot color="#047857" label="0 chronic conditions" />
                <LegendDot color="#b45309" label="1–2 chronic conditions" />
                <LegendDot color="#be123c" label="3+ chronic conditions" />
              </>
            ) : (
              RAMP.map((color, i) => {
                const lo = i === 0 ? null : breakpoints[i - 1];
                const hi = i === 4 ? null : breakpoints[i];
                const px = 8 + i * 3.5;
                return (
                  <div key={i} className="flex items-center gap-2.5">
                    <span className="inline-flex shrink-0 items-center justify-center" style={{ width: 22, height: 22 }}>
                      <span className="rounded-full ring-2 ring-white" style={{ backgroundColor: color, width: px, height: px }} />
                    </span>
                    <span className="tabular text-[var(--ink)]">
                      {lo === null ? '< ' : `${fmt(lo)} – `}
                      {hi === null ? `${fmt(breakpoints[3])}+` : fmt(hi)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--hairline-soft)] text-[10px] text-[var(--ink-soft)]">
            {selected ? 'Each dot is one patient (jittered within ZIP).' : 'Bubble size = patient count. Color = quintile of selected metric.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function FitOnEnter({ zipAggs, selected }: { zipAggs: ZipAgg[]; selected: ZipAgg | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) {
      map.flyTo([selected.lat, selected.lng], 14, { duration: 0.8 });
    } else if (zipAggs.length > 0) {
      const bounds = L.latLngBounds(zipAggs.map((z) => [z.lat, z.lng] as [number, number]));
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 12, duration: 0.8 });
    }
  }, [selected?.zip, zipAggs.length, map]);
  return null;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-block h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: color }} />
      <span className="text-[var(--ink)]">{label}</span>
    </div>
  );
}
