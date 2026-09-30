import { useEffect, useState } from 'react';
import type { Site } from './types';

// Live conditions from free public sources: NWS (air), NOAA CO-OPS (water temp, tides),
// Open-Meteo Marine (offshore sea surface temp, waves), USGS (river level for springs).
// Every result is cached so the last good reading is still shown offline, with its age.

export type Result<T> =
  | { status: 'loading' }
  | { status: 'ok'; data: T; fetchedAt: number; stale?: boolean }
  | { status: 'unavailable'; reason: string };

const TTL = 15 * 60 * 1000;
const PREFIX = 'dc-cond:';

async function cached<T>(key: string, load: () => Promise<T>): Promise<Result<T>> {
  let prior: { data: T; fetchedAt: number } | null = null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) prior = JSON.parse(raw);
  } catch {
    prior = null;
  }
  if (prior && Date.now() - prior.fetchedAt < TTL) return { status: 'ok', ...prior };
  try {
    const data = await load();
    const entry = { data, fetchedAt: Date.now() };
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      /* ignore */
    }
    return { status: 'ok', ...entry };
  } catch (err) {
    if (prior) return { status: 'ok', ...prior, stale: true };
    return { status: 'unavailable', reason: err instanceof Error ? err.message : 'Source did not respond' };
  }
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json, application/geo+json' } });
  if (!res.ok) throw new Error(`Source returned ${res.status}`);
  return res.json();
}

function ymd(d: Date) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// NOAA returns station-local times like "2026-09-30 10:06"
function coopsTime(t: string) {
  return new Date(t.replace(' ', 'T')).getTime();
}

const COOPS = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?units=english&time_zone=lst_ldt&format=json&application=divers_companion';

export interface Air { tempF: number; wind: string; summary: string }
export interface WaterTemp { tempF: number; source: string; observedAt: number; kind: 'station' | 'model' | 'spring' }
export interface Tides { hilo: { t: number; ft: number; type: 'H' | 'L' }[]; hourly: { t: number; ft: number }[] }
export interface Marine { waveFt: number | null }
export interface River { latestFt: number; minFt: number; maxFt: number; position: number; observedAt: number; label: string }

export function fetchAir(site: Site) {
  return cached<Air>(`air:${site.id}`, async () => {
    const point = await getJson(`https://api.weather.gov/points/${site.lat.toFixed(4)},${site.lng.toFixed(4)}`);
    const hourly = await getJson(point.properties.forecastHourly);
    const p = hourly.properties.periods[0];
    return { tempF: p.temperature, wind: `${p.windDirection} ${p.windSpeed}`, summary: p.shortForecast };
  });
}

export function fetchWaterTemp(site: Site) {
  const src = site.waterSource;
  if (src.type === 'spring') {
    return Promise.resolve<Result<WaterTemp>>({
      status: 'ok', fetchedAt: Date.now(),
      data: { tempF: src.tempF, source: 'Spring, steady all year', observedAt: Date.now(), kind: 'spring' }
    });
  }
  const model = () =>
    cached<WaterTemp>(`sst:${site.id}`, async () => {
      const j = await getJson(`https://marine-api.open-meteo.com/v1/marine?latitude=${site.lat}&longitude=${site.lng}&current=sea_surface_temperature&temperature_unit=fahrenheit&timezone=auto`);
      const v = j.current?.sea_surface_temperature;
      if (typeof v !== 'number') throw new Error('No sea temperature for this spot');
      return { tempF: v, source: 'Marine forecast model', observedAt: Date.now(), kind: 'model' };
    });
  if (src.type === 'model') return model();
  return cached<WaterTemp>(`wt:${src.station}`, async () => {
    const j = await getJson(`${COOPS}&date=latest&product=water_temperature&station=${src.station}`);
    const row = j.data?.[0];
    if (!row) throw new Error('Station reported no water temperature');
    return { tempF: parseFloat(row.v), source: src.label, observedAt: coopsTime(row.t), kind: 'station' };
  }).then((r) => (r.status === 'unavailable' ? model() : r));
}

export function fetchTides(site: Site) {
  const st = site.tideStation;
  if (!st) return Promise.resolve<Result<Tides>>({ status: 'unavailable', reason: 'No tide station set for this site' });
  const today = new Date();
  return cached<Tides>(`tide:${st.id}:${ymd(today)}`, async () => {
    const [hilo, hourly] = await Promise.all([
      getJson(`${COOPS}&product=predictions&datum=MLLW&interval=hilo&begin_date=${ymd(today)}&range=48&station=${st.id}`),
      getJson(`${COOPS}&product=predictions&datum=MLLW&interval=h&begin_date=${ymd(today)}&range=24&station=${st.id}`)
    ]);
    return {
      hilo: (hilo.predictions ?? []).map((p: { t: string; v: string; type: 'H' | 'L' }) => ({ t: coopsTime(p.t), ft: parseFloat(p.v), type: p.type })),
      hourly: (hourly.predictions ?? []).map((p: { t: string; v: string }) => ({ t: coopsTime(p.t), ft: parseFloat(p.v) }))
    };
  });
}

export function fetchMarine(site: Site) {
  if (site.kind === 'spring' || site.waterSource.type === 'spring') {
    return Promise.resolve<Result<Marine>>({ status: 'unavailable', reason: 'Not an ocean site' });
  }
  return cached<Marine>(`waves:${site.id}`, async () => {
    const j = await getJson(`https://marine-api.open-meteo.com/v1/marine?latitude=${site.lat}&longitude=${site.lng}&current=wave_height&timezone=auto`);
    const m = j.current?.wave_height;
    return { waveFt: typeof m === 'number' ? Math.round(m * 3.281 * 10) / 10 : null };
  });
}

export function fetchRiver(site: Site) {
  const g = site.usgsGauge;
  if (!g) return Promise.resolve<Result<River>>({ status: 'unavailable', reason: 'No river gauge for this site' });
  return cached<River>(`river:${g.id}`, async () => {
    const j = await getJson(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${g.id}&parameterCd=00065&period=P30D&siteStatus=all`);
    const values: { value: string; dateTime: string }[] = j.value?.timeSeries?.[0]?.values?.[0]?.value ?? [];
    const nums = values.map((v) => parseFloat(v.value)).filter((n) => Number.isFinite(n) && n > -999);
    if (!nums.length) throw new Error('Gauge returned no readings');
    const latestFt = nums[nums.length - 1];
    const minFt = Math.min(...nums);
    const maxFt = Math.max(...nums);
    const position = maxFt === minFt ? 0.5 : (latestFt - minFt) / (maxFt - minFt);
    return { latestFt, minFt, maxFt, position, observedAt: new Date(values[values.length - 1].dateTime).getTime(), label: g.label };
  });
}

export function useResult<T>(key: string, load: () => Promise<Result<T>>): Result<T> {
  const [res, setRes] = useState<Result<T>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setRes({ status: 'loading' });
    load().then((r) => alive && setRes(r)).catch(() => alive && setRes({ status: 'unavailable', reason: 'Source did not respond' }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return res;
}

export function useSiteConditions(site: Site) {
  return {
    air: useResult(`air-${site.id}`, () => fetchAir(site)),
    water: useResult(`water-${site.id}`, () => fetchWaterTemp(site)),
    tides: useResult(`tides-${site.id}`, () => fetchTides(site)),
    marine: useResult(`marine-${site.id}`, () => fetchMarine(site)),
    river: useResult(`river-${site.id}`, () => fetchRiver(site))
  };
}
