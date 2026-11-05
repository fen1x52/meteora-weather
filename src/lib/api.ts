import type {
  AirQualityData, AirValues, CurrentWeather, DailyWeather, EarthquakeData,
  GeomagneticData, HistoryData, HourlyWeather, Language, Location, NaturalEventData,
  OfficialAlertsData, RadarData, WeatherData,
} from "./types";

const MINUTE = 60_000;
export const SOURCES = {
  forecast: "https://api.open-meteo.com/v1/forecast",
  geocoding: "https://geocoding-api.open-meteo.com/v1/search",
  air: "https://air-quality-api.open-meteo.com/v1/air-quality",
  archive: "https://archive-api.open-meteo.com/v1/archive",
  earthquakes: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
  nature: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=80",
  geomagnetic: "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
  radar: "https://api.rainviewer.com/public/weather-maps.json",
} as const;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); this.name = "ApiError"; }
}
interface CacheEntry { value: unknown; expires: number; fetchedAt: string }
const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<CacheEntry>>();
export function clearApiCache(): void { cache.clear(); }

/** Small bounded in-memory cache. Failed responses are never cached as successful data. */
async function request(url: string, ttl = 10 * MINUTE): Promise<CacheEntry> {
  const previous = cache.get(url);
  if (previous && previous.expires > Date.now()) return previous;
  const underway = pending.get(url);
  if (underway) return underway;
  const task = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14_000);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
        if (!response.ok) throw new ApiError(response.status === 429
          ? "Источник временно ограничил запросы. Повторите позже. / API rate limit; try again later."
          : `Источник недоступен (HTTP ${response.status}). / Data source unavailable.`, response.status);
        const value: unknown = await response.json();
        if (typeof value !== "object" || value === null) throw new ApiError("Некорректный ответ источника. / Invalid API response.");
        const entry = { value, expires: Date.now() + ttl, fetchedAt: new Date().toISOString() };
        if (cache.size >= 64) { const oldest = cache.keys().next().value; if (oldest) cache.delete(oldest); }
        cache.set(url, entry);
        return entry;
      } catch (error) {
        if (attempt === 1 || (error instanceof ApiError && error.status && error.status < 500 && error.status !== 429)) {
          if (error instanceof ApiError) throw error;
          throw new ApiError("Не удалось загрузить данные. Проверьте соединение и повторите. / Unable to load data; check your connection and retry.");
        }
        await new Promise(resolve => setTimeout(resolve, 600));
      } finally { clearTimeout(timeout); }
    }
    throw new ApiError("Источник не ответил. / Data source did not respond.");
  })();
  pending.set(url, task);
  try { return await task; } finally { pending.delete(url); }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new ApiError("Неполные данные источника. / Incomplete API response.");
  return value;
}
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function requiredNumber(value: unknown): number {
  const result = number(value);
  if (result === null) throw new ApiError("Некорректные числовые данные. / Invalid numeric data.");
  return result;
}
function string(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function safeUrl(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:" ? url.href : fallback; } catch { return fallback; }
}
function unitMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}
function timezone(value: unknown): string {
  const zone = string(value, "UTC");
  try { new Intl.DateTimeFormat("en", { timeZone: zone }).format(); return zone; } catch { return "UTC"; }
}
function times(value: unknown): number[] {
  if (!Array.isArray(value) || !value.length || value.length > 20_000) throw new ApiError("Временной ряд недоступен. / Time series unavailable.");
  const values = value.map(requiredNumber);
  if (values.some((time, index) => index > 0 && time <= values[index - 1])) throw new ApiError("Некорректный временной ряд. / Invalid time series.");
  return values;
}
function series<T extends string>(source: Record<string, unknown>, keys: readonly T[], length: number): Record<T, (number | null)[]> {
  return Object.fromEntries(keys.map(key => {
    const values = source[key];
    return [key, Array.from({ length }, (_, index) => Array.isArray(values) ? number(values[index]) : null)];
  })) as Record<T, (number | null)[]>;
}
function scalars<T extends string>(source: Record<string, unknown>, keys: readonly T[]): Record<T, number | null> {
  return Object.fromEntries(keys.map(key => [key, number(source[key])])) as Record<T, number | null>;
}
export function validateLocation(location: Pick<Location, "latitude" | "longitude">): void {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
    throw new ApiError("Некорректные координаты. / Invalid coordinates.");
  }
}
function locationParams(location: Location): URLSearchParams {
  validateLocation(location);
  return new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), timezone: "auto", timeformat: "unixtime" });
}

const CURRENT_KEYS = ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "is_day", "precipitation", "rain", "snowfall", "weather_code", "cloud_cover", "pressure_msl", "surface_pressure", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"] as const;
const HOURLY_KEYS = ["temperature_2m", "apparent_temperature", "relative_humidity_2m", "precipitation_probability", "precipitation", "rain", "snowfall", "snow_depth", "weather_code", "cloud_cover", "visibility", "pressure_msl", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m", "uv_index", "is_day"] as const;
const DAILY_KEYS = ["weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset", "daylight_duration", "sunshine_duration", "uv_index_max", "precipitation_sum", "precipitation_probability_max", "snowfall_sum", "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant"] as const;
const AIR_KEYS = ["european_aqi", "us_aqi", "pm2_5", "pm10", "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide", "ozone", "dust"] as const satisfies readonly (keyof AirValues)[];
const HISTORY_KEYS = ["weather_code", "temperature_2m_max", "temperature_2m_min", "precipitation_sum", "snowfall_sum", "wind_speed_10m_max"] as const;

export function parseWeather(value: unknown, fetchedAt: string): WeatherData {
  const raw = record(value), current = record(raw.current), hourly = record(raw.hourly), daily = record(raw.daily);
  const hourTimes = times(hourly.time), dayTimes = times(daily.time);
  const currentUnits = unitMap(raw.current_units), hourlyUnits = unitMap(raw.hourly_units), dailyUnits = unitMap(raw.daily_units);
  if (currentUnits.temperature_2m && currentUnits.temperature_2m !== "°C") throw new ApiError("Unexpected temperature unit.");
  if (currentUnits.wind_speed_10m && currentUnits.wind_speed_10m !== "m/s") throw new ApiError("Unexpected wind unit.");
  const c: CurrentWeather = { time: requiredNumber(current.time), interval: number(current.interval) ?? 900, ...scalars(current, CURRENT_KEYS) };
  const h: HourlyWeather = { time: hourTimes, ...series(hourly, HOURLY_KEYS, hourTimes.length) };
  const d: DailyWeather = { time: dayTimes, ...series(daily, DAILY_KEYS, dayTimes.length) };
  return { latitude: requiredNumber(raw.latitude), longitude: requiredNumber(raw.longitude), timezone: timezone(raw.timezone), utc_offset_seconds: number(raw.utc_offset_seconds) ?? 0, current: c, hourly: h, daily: d, current_units: currentUnits, hourly_units: hourlyUnits, daily_units: dailyUnits, fetchedAt };
}
export async function fetchWeather(location: Location): Promise<WeatherData> {
  const params = locationParams(location);
  params.set("current", CURRENT_KEYS.join(","));
  params.set("hourly", HOURLY_KEYS.join(","));
  params.set("daily", DAILY_KEYS.join(","));
  params.set("forecast_days", "14");
  params.set("wind_speed_unit", "ms");
  params.set("temperature_unit", "celsius");
  params.set("precipitation_unit", "mm");
  const result = await request(`${SOURCES.forecast}?${params}`);
  return parseWeather(result.value, result.fetchedAt);
}
export async function fetchLocations(query: string, language: Language = "ru"): Promise<Location[]> {
  const name = query.trim().slice(0, 120);
  if (name.length < 2) return [];
  const params = new URLSearchParams({ name, count: "8", language, format: "json" });
  const raw = record((await request(`${SOURCES.geocoding}?${params}`, 60 * MINUTE)).value);
  if (!Array.isArray(raw.results)) return [];
  return raw.results.flatMap(value => {
    if (!isRecord(value) || number(value.latitude) === null || number(value.longitude) === null || !string(value.name)) return [];
    const location: Location = { id: String(value.id ?? `${value.latitude},${value.longitude}`), name: string(value.name), country: string(value.country), countryCode: string(value.country_code), admin1: string(value.admin1), latitude: requiredNumber(value.latitude), longitude: requiredNumber(value.longitude), timezone: timezone(value.timezone) };
    try { validateLocation(location); return [location]; } catch { return []; }
  });
}
export async function fetchAirQuality(location: Location): Promise<AirQualityData> {
  const params = locationParams(location);
  params.set("current", AIR_KEYS.join(",")); params.set("hourly", AIR_KEYS.join(",")); params.set("forecast_days", "5");
  const result = await request(`${SOURCES.air}?${params}`, 30 * MINUTE);
  const raw = record(result.value), current = record(raw.current), hourly = record(raw.hourly), hourTimes = times(hourly.time);
  return { latitude: requiredNumber(raw.latitude), longitude: requiredNumber(raw.longitude), timezone: timezone(raw.timezone), utc_offset_seconds: number(raw.utc_offset_seconds) ?? 0, current: { time: requiredNumber(current.time), interval: number(current.interval) ?? 3600, ...scalars(current, AIR_KEYS) }, hourly: { time: hourTimes, ...series(hourly, AIR_KEYS, hourTimes.length) }, current_units: unitMap(raw.current_units), hourly_units: unitMap(raw.hourly_units), fetchedAt: result.fetchedAt };
}
export function validateHistoryRange(start: string, end: string, now = Date.now()): void {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end) || start > end || start < "1940-01-01") throw new ApiError("Проверьте период истории (с 1940 года). / Check history dates (1940 onwards).");
  if (Date.parse(`${end}T00:00:00Z`) > now - 5 * 86_400_000) throw new ApiError("Архив доступен с задержкой 5 дней. / Archive is available with a 5-day delay.");
  if (Date.parse(end) - Date.parse(start) > 92 * 86_400_000) throw new ApiError("Выберите период до 93 дней. / Select up to 93 days.");
}
export async function fetchHistory(location: Location, start: string, end: string): Promise<HistoryData> {
  validateHistoryRange(start, end);
  const params = locationParams(location); params.set("start_date", start); params.set("end_date", end); params.set("daily", HISTORY_KEYS.join(",")); params.set("wind_speed_unit", "ms");
  const result = await request(`${SOURCES.archive}?${params}`, 24 * 60 * MINUTE), raw = record(result.value), daily = record(raw.daily), dayTimes = times(daily.time);
  return { timezone: timezone(raw.timezone), utc_offset_seconds: number(raw.utc_offset_seconds) ?? 0, daily: { time: dayTimes, ...series(daily, HISTORY_KEYS, dayTimes.length) }, daily_units: unitMap(raw.daily_units), fetchedAt: result.fetchedAt };
}
export async function fetchEarthquakes(): Promise<EarthquakeData> {
  const result = await request(SOURCES.earthquakes, 5 * MINUTE), raw = record(result.value);
  if (!Array.isArray(raw.features)) throw new ApiError("USGS: invalid feed.");
  const metadata = isRecord(raw.metadata) ? raw.metadata : {};
  const events = raw.features.flatMap(value => {
    if (!isRecord(value) || !isRecord(value.properties) || !isRecord(value.geometry) || !Array.isArray(value.geometry.coordinates)) return [];
    const p = value.properties, coords = value.geometry.coordinates;
    if (number(coords[0]) === null || number(coords[1]) === null || number(p.time) === null) return [];
    return [{ id: string(value.id), title: string(p.title), magnitude: number(p.mag), place: string(p.place), time: requiredNumber(p.time) / 1000, updated: (number(p.updated) ?? requiredNumber(p.time)) / 1000, latitude: requiredNumber(coords[1]), longitude: requiredNumber(coords[0]), depth: number(coords[2]), url: safeUrl(p.url, "https://earthquake.usgs.gov/"), tsunami: p.tsunami === 1 }];
  }).sort((a, b) => b.time - a.time);
  return { events, generatedAt: new Date(number(metadata.generated) ?? Date.parse(result.fetchedAt)).toISOString(), fetchedAt: result.fetchedAt };
}
export async function fetchNaturalEvents(): Promise<NaturalEventData> {
  const result = await request(SOURCES.nature, 30 * MINUTE), raw = record(result.value);
  if (!Array.isArray(raw.events)) throw new ApiError("NASA EONET: invalid feed.");
  const events = raw.events.flatMap(value => {
    if (!isRecord(value) || !Array.isArray(value.geometry)) return [];
    const point = [...value.geometry].reverse().find(v => isRecord(v) && v.type === "Point" && Array.isArray(v.coordinates));
    if (!isRecord(point) || !Array.isArray(point.coordinates) || number(point.coordinates[0]) === null || number(point.coordinates[1]) === null) return [];
    return [{ id: string(value.id), title: string(value.title), categories: Array.isArray(value.categories) ? value.categories.filter(isRecord).map(v => ({ id: string(v.id), title: string(v.title) })) : [], date: string(point.date), latitude: requiredNumber(point.coordinates[1]), longitude: requiredNumber(point.coordinates[0]), sources: Array.isArray(value.sources) ? value.sources.filter(isRecord).map(v => ({ id: string(v.id), url: safeUrl(v.url) })).filter(v => v.url) : [], url: safeUrl(value.link, "https://eonet.gsfc.nasa.gov/") }];
  });
  return { events, fetchedAt: result.fetchedAt };
}
export async function fetchGeomagnetic(): Promise<GeomagneticData> {
  const result = await request(SOURCES.geomagnetic, 15 * MINUTE);
  if (!Array.isArray(result.value)) throw new ApiError("NOAA: invalid Kp feed.");
  // NOAA has published both tabular and object formats; accept both explicitly.
  const points = result.value.flatMap(value => {
    const rawTime = Array.isArray(value) ? value[0] : isRecord(value) ? value.time_tag : undefined;
    const rawKp = Array.isArray(value) ? value[1] : isRecord(value) ? value.Kp : undefined;
    const timestamp = string(rawTime), kp = typeof rawKp === "string" ? Number(rawKp) : number(rawKp);
    const time = Date.parse(timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`) / 1000;
    return Number.isFinite(time) && kp !== null && Number.isFinite(kp) && kp >= 0 && kp <= 9 ? [{ time, kp }] : [];
  }).sort((a, b) => a.time - b.time);
  if (!points.length) throw new ApiError("NOAA: Kp unavailable.");
  return { points, latest: points[points.length - 1], fetchedAt: result.fetchedAt };
}
export async function fetchRadar(): Promise<RadarData> {
  const result = await request(SOURCES.radar, 5 * MINUTE), raw = record(result.value), radar = record(raw.radar);
  const host = safeUrl(raw.host);
  if (!host.startsWith("https://") || !new URL(host).hostname.endsWith(".rainviewer.com")) throw new ApiError("RainViewer: invalid tile host.");
  const past = Array.isArray(radar.past) ? radar.past.filter(isRecord).flatMap(v => number(v.time) !== null && /^\/v2\/radar\/[\w/-]+$/.test(string(v.path)) ? [{ time: requiredNumber(v.time), path: string(v.path) }] : []) : [];
  if (!past.length) throw new ApiError("RainViewer: radar frames unavailable.");
  return { host: host.replace(/\/$/, ""), generated: requiredNumber(raw.generated), radar: { past }, fetchedAt: result.fetchedAt };
}
export async function fetchOfficialAlerts(location: Location): Promise<OfficialAlertsData> {
  validateLocation(location);
  const unavailable = (): OfficialAlertsData => ({ supported: false, reason: "Официальные предупреждения NWS доступны только для территории США. / Official NWS alerts cover the United States only.", alerts: [], fetchedAt: new Date().toISOString(), source: "NOAA / National Weather Service" });
  if (location.countryCode && location.countryCode !== "US") return unavailable();
  if (!location.countryCode) {
    try { await request(`https://api.weather.gov/points/${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`, 60 * MINUTE); }
    catch (error) { if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return unavailable(); throw error; }
  }
  const result = await request(`https://api.weather.gov/alerts/active?point=${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`, 5 * MINUTE), raw = record(result.value);
  if (!Array.isArray(raw.features)) throw new ApiError("NWS: invalid alerts feed.");
  const alerts = raw.features.flatMap(value => {
    if (!isRecord(value) || !isRecord(value.properties)) return [];
    const p = value.properties;
    return [{ id: string(value.id), event: string(p.event), headline: string(p.headline, string(p.event)), description: string(p.description), instruction: string(p.instruction), severity: string(p.severity), effective: string(p.effective), expires: string(p.expires), url: safeUrl(p.web, safeUrl(value.id, "https://www.weather.gov/alerts")), senderName: string(p.senderName) }];
  });
  return { supported: true, alerts, fetchedAt: result.fetchedAt, source: "NOAA / National Weather Service" };
}

