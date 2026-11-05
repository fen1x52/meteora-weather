'use client';
import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { MotionConfig } from 'motion/react';
import { fetchWeather } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { subscribePreferences, getPreferences, getServerPreferences, updatePreferences, clearPreferences } from '@/lib/preferences';
import type { Location, Settings } from '@/lib/types';
function useMeteoraState() {
  const preferences = useSyncExternalStore(subscribePreferences, getPreferences, getServerPreferences);
  const { location, settings, favorites, recent } = preferences;
  const weather = useResource(`weather:${location.latitude}:${location.longitude}`, () => fetchWeather(location));
  const t = (ru: string, en: string) => settings.language === 'ru' ? ru : en;
  const setLocation = (next: Location) => updatePreferences({ location: next, recent: [next, ...recent.filter(l => l.id !== next.id)].slice(0, 8) });
  const setSettings = (next: Partial<Settings>) => updatePreferences({ settings: { ...settings, ...next } });
  const toggleFavorite = (city: Location) => updatePreferences({ favorites: favorites.some(l => l.id === city.id) ? favorites.filter(l => l.id !== city.id) : [...favorites, city].slice(0, 20) });
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => { document.documentElement.dataset.theme = settings.theme === 'auto' ? (query.matches ? 'dark' : 'light') : settings.theme; };
    document.documentElement.dataset.density = settings.density;
    apply(); query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [settings.theme, settings.density]);
  useEffect(() => { document.documentElement.lang = settings.language; document.documentElement.dataset.motion = settings.animations ? 'on' : 'off'; }, [settings.language, settings.animations]);
  return { ...preferences, t, setLocation, setSettings, toggleFavorite, clearData: clearPreferences, weather };
}
type MeteoraContext = ReturnType<typeof useMeteoraState>;
const Context = createContext<MeteoraContext | null>(null);
export function Providers({ children }: { children: React.ReactNode }) {
  const value = useMeteoraState();
  return <Context.Provider value={value}><MotionConfig reducedMotion={value.settings.animations ? 'user' : 'always'}>{children}</MotionConfig></Context.Provider>;
}
export function useMeteora() { const ctx = useContext(Context); if (!ctx) throw new Error('Meteora provider required'); return ctx; }



