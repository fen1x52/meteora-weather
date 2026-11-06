import type { Location, Settings } from './types';
export const DEFAULT_LOCATION: Location = { id: '499099', name: 'Самара', country: 'Россия', countryCode: 'RU', admin1: 'Самарская область', latitude: 53.1959, longitude: 50.1002, timezone: 'Europe/Samara' };
export const DEFAULT_SETTINGS: Settings = { language: 'ru', temperature: 'celsius', wind: 'ms', pressure: 'mmhg', theme: 'dark', density: 'comfortable', animations: true, notifications: false };
export interface Preferences { location: Location; settings: Settings; favorites: Location[]; recent: Location[] }
const defaults: Preferences = { location: DEFAULT_LOCATION, settings: DEFAULT_SETTINGS, favorites: [], recent: [] };
const KEY = 'meteora.preferences.v1';
let snapshot = defaults;
let initialized = false;
const listeners = new Set<() => void>();
export function validLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<Location>;
  if (v.timezone !== undefined) { try { new Intl.DateTimeFormat('en', { timeZone: v.timezone }); } catch { return false; } }
  if ((v.admin1 !== undefined && typeof v.admin1 !== 'string') || (v.countryCode !== undefined && typeof v.countryCode !== 'string')) return false;
  return typeof v.id === 'string' && typeof v.name === 'string' && v.name.length <= 200 && typeof v.country === 'string' && typeof v.latitude === 'number' && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 && typeof v.longitude === 'number' && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180 && (v.timezone === undefined || typeof v.timezone === 'string');
}
export function sanitizePreferences(value: unknown): Preferences {
  if (!value || typeof value !== 'object') return defaults;
  const v = value as Partial<Preferences>;
  const s = v.settings || DEFAULT_SETTINGS;
  const settings: Settings = {
    language: s.language === 'en' ? 'en' : 'ru',
    temperature: s.temperature === 'fahrenheit' ? 'fahrenheit' : 'celsius',
    wind: ['ms', 'kmh', 'mph'].includes(s.wind) ? s.wind : 'ms',
    pressure: s.pressure === 'mmhg' ? 'mmhg' : 'hpa',
    theme: ['auto', 'light', 'dark', 'aurora', 'ocean', 'sunset'].includes(s.theme) ? s.theme : 'auto',
    density: s.density === 'compact' ? 'compact' : 'comfortable',
    animations: typeof s.animations === 'boolean' ? s.animations : true,
    notifications: s.notifications === true,
  };
  return { location: validLocation(v.location) ? v.location : DEFAULT_LOCATION, settings,
    favorites: Array.isArray(v.favorites) ? v.favorites.filter(validLocation).slice(0, 20) : [],
    recent: Array.isArray(v.recent) ? v.recent.filter(validLocation).slice(0, 8) : [] };
}
function read(): Preferences { try { return sanitizePreferences(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return defaults; } }
export function subscribePreferences(listener: () => void) {
  listeners.add(listener);
  if (!initialized) { initialized = true; snapshot = read(); }
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) { snapshot = read(); listeners.forEach(fn => fn()); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}
export const getPreferences = () => snapshot;
export const getServerPreferences = () => defaults;
export function updatePreferences(update: Partial<Preferences>) {
  snapshot = sanitizePreferences({ ...snapshot, ...update });
  try { localStorage.setItem(KEY, JSON.stringify(snapshot)); } catch { /* Preferences remain usable in memory when storage is blocked. */ }
  listeners.forEach(fn => fn());
}
export function clearPreferences() { snapshot = defaults; try { localStorage.removeItem(KEY); } catch {} listeners.forEach(fn => fn()); }


