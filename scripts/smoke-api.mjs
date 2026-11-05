/** Live integration smoke test; never used as application data or a fixture. */
import { performance } from 'node:perf_hooks';

const forecast = new URL('https://api.open-meteo.com/v1/forecast');
forecast.search = new URLSearchParams({ latitude: '55.75', longitude: '37.62', timezone: 'auto', timeformat: 'unixtime', wind_speed_unit: 'ms', temperature_unit: 'celsius', forecast_days: '14', current: 'temperature_2m,wind_speed_10m,weather_code', hourly: 'temperature_2m,precipitation_probability,visibility,snow_depth,uv_index', daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset' }).toString();
const archiveEnd = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const archiveStart = new Date(Date.now() - 9 * 86400000).toISOString().slice(0, 10);
const probes = [
  ['Open-Meteo forecast', forecast.href, (d) => Number.isFinite(d.current?.time) && d.current_units?.wind_speed_10m === 'm/s' && d.current_units?.temperature_2m === '°C' && d.hourly?.time?.length >= 24 && d.daily?.time?.length === 14],
  ['Open-Meteo geocoding', 'https://geocoding-api.open-meteo.com/v1/search?name=London&count=3&language=ru&format=json', (d) => Array.isArray(d.results) && d.results.some((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))],
  ['Open-Meteo air / CAMS', 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=55.75&longitude=37.62&timezone=auto&timeformat=unixtime&current=european_aqi,us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust&hourly=european_aqi,pm2_5&forecast_days=5', (d) => Number.isFinite(d.current?.time) && Array.isArray(d.hourly?.time) && d.hourly.time.length >= 24],
  ['Open-Meteo historical reanalysis', `https://archive-api.open-meteo.com/v1/archive?latitude=55.75&longitude=37.62&timezone=auto&timeformat=unixtime&start_date=${archiveStart}&end_date=${archiveEnd}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&wind_speed_unit=ms`, (d) => Array.isArray(d.daily?.time) && d.daily.time.length === 3],
  ['USGS earthquakes', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', (d) => d.type === 'FeatureCollection' && Array.isArray(d.features)],
  ['NASA EONET', 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=5', (d) => Array.isArray(d.events)],
  ['NOAA planetary Kp', 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', (d) => Array.isArray(d) && d.length > 1],
  ['RainViewer radar metadata', 'https://api.rainviewer.com/public/weather-maps.json', (d) => typeof d.host === 'string' && Array.isArray(d.radar?.past) && d.radar.past.length > 0],
  ['NWS official alerts', 'https://api.weather.gov/alerts/active?point=40.7128,-74.0060', (d) => Array.isArray(d.features)],
];

async function probe([name, url, validate]) {
  const started = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json', Origin: 'http://localhost:3000' } });
    const cors = response.headers.get('access-control-allow-origin');
    if (!response.ok) return { name, ok: false, status: response.status, error: `HTTP ${response.status}`, cors, ms: Math.round(performance.now() - started) };
    const data = await response.json();
    const ok = validate(data);
    return { name, ok, status: response.status, cors, ms: Math.round(performance.now() - started), ...(ok ? {} : { error: 'Unexpected response shape' }) };
  } catch (error) {
    return { name, ok: false, error: error instanceof Error ? error.message : 'Unknown network error', ms: Math.round(performance.now() - started) };
  }
}

const results = [];
// At most three simultaneous requests; exactly one request per probe, no retries.
for (let offset = 0; offset < probes.length; offset += 3) results.push(...await Promise.all(probes.slice(offset, offset + 3).map(probe)));
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), note: 'Live network checks. A pass verifies this response only, not future availability or browser behavior. No forecast samples are saved.', results }, null, 2));
process.exitCode = results.every((result) => result.ok) ? 0 : 1;

