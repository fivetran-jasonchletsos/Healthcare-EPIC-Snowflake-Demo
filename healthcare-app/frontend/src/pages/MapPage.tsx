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

const RAMP = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'];

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
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-3">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              {selected ? `ZIP ${selected.zip}` : 'Patient density map'}{' '}
              <span className="text-slate-400 text-sm font-normal">— {MODE_META[mode].label}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {loading
                ? 'Loading patients…'
                : selected
                ? `${formatNumber(selected.count)} patients in this ZIP. Click another ZIP or back out.`
                : `${formatNumber(zipAggs.length)} ZIPs · ${formatNumber(placed.length)} patients. Click any bubble to drill in.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected && (
              <button onClick={() => setSelectedZip(null)} className="rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium px-3 py-1.5">
                ← Back to county
              </button>
            )}
            <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1 text-xs">
              {(Object.keys(MODE_META) as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1.5 rounded font-medium ${mode === m ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {MODE_META[m].label}
                </button>
              ))}
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
                      <div className="font-mono text-slate-500">ZIP {z.zip}</div>
                      <div className="font-semibold text-slate-900">{z.city}</div>
                      <div className="mt-2">
                        <strong>Patients:</strong> {formatNumber(z.count)}
                      </div>
                      <div className="text-slate-500">
                        Median charges {formatCurrency(z.medianCharges)} · Median chronic dx {z.medianChronic}
                      </div>
                      <button onClick={() => setSelectedZip(z.zip)} className="mt-2 text-brand-700 hover:text-brand-900 font-medium">
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
                    fillColor: p.active_chronic_count >= 3 ? '#b91c1c' : p.active_chronic_count >= 1 ? '#f59e0b' : '#10b981',
                    fillOpacity: 0.85,
                  }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-mono text-slate-500">MRN {p.med_rec_num}</div>
                      <div className="font-semibold text-slate-900 mt-0.5">{p.full_name}</div>
                      <div className="text-slate-500">{p.age} y/o · {p.sex}</div>
                      <div className="mt-2 text-sm">
                        <strong>{p.encounter_count} visits</strong> · {p.active_chronic_count} chronic
                      </div>
                      <button onClick={() => navigate(`/patients/${encodeURIComponent(p.pat_id)}`)} className="mt-2 text-brand-700 hover:text-brand-900 font-medium">
                        Open patient →
                      </button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        )}

        <div className="absolute bottom-4 right-4 z-[400] rounded-xl bg-white/95 backdrop-blur shadow-lg border border-slate-200 p-3 text-xs max-w-[280px]">
          <div className="font-semibold text-slate-900 mb-2">
            {selected ? 'Chronic burden' : MODE_META[mode].label + ' per ZIP'}
          </div>
          <div className="space-y-1.5">
            {selected ? (
              <>
                <LegendDot color="#10b981" label="0 chronic conditions" />
                <LegendDot color="#f59e0b" label="1–2 chronic conditions" />
                <LegendDot color="#b91c1c" label="3+ chronic conditions" />
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
                    <span className="tabular-nums text-slate-700">
                      {lo === null ? '< ' : `${fmt(lo)} – `}
                      {hi === null ? `${fmt(breakpoints[3])}+` : fmt(hi)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
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
      <span className="text-slate-700">{label}</span>
    </div>
  );
}
