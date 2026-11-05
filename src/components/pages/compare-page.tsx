'use client';
import Link from 'next/link';
import { useResource } from '@/lib/use-resource';
import { fetchWeather } from '@/lib/api';
import { formatTemp, formatWind, weatherLabel } from '@/lib/weather';
import { useMeteora } from '@/components/providers';
import { PageHeading, Panel, State, WeatherIcon } from '@/components/ui';
function CityWeather({ city, settings, t }: { city: import('@/lib/types').Location; settings: ReturnType<typeof useMeteora>['settings']; t: (ru: string, en: string) => string }) {
  const result = useResource(`compare:${city.id}:${city.latitude}:${city.longitude}`, () => fetchWeather(city));
  if (!result.data) return <Panel><div className="section-heading"><strong>{city.name}</strong><span className="muted">{city.country}</span></div><State loading={result.loading} error={result.error} retry={result.refresh}/></Panel>;
  const { current, daily } = result.data;
  return <Panel><div className="section-heading"><div><strong>{city.name}</strong><div className="muted small-text">{city.country}</div></div><WeatherIcon code={current.weather_code} size={28}/></div><div className="metric-value">{formatTemp(current.temperature_2m, settings)}</div><p className="muted">{weatherLabel(current.weather_code, settings.language)}</p><div className="metric-detail">{t('Ощущается как', 'Feels like')} {formatTemp(current.apparent_temperature, settings)} · {t('Ветер', 'Wind')} {formatWind(current.wind_speed_10m, settings)}</div><div className="metric-detail">↑ {formatTemp(daily.temperature_2m_max[0], settings)} ↓ {formatTemp(daily.temperature_2m_min[0], settings)} · {t('Осадки', 'Precipitation')} {daily.precipitation_probability_max[0] ?? '—'}%</div></Panel>;
}
export default function ComparePage() {
  const { t, location, favorites, settings } = useMeteora();
  const cities = [location, ...favorites.filter(city => city.id !== location.id)].slice(0, 6);
  return <><PageHeading eyebrow={t('ОДИН ПРОГНОЗ — НЕСКОЛЬКО МЕСТ', 'ONE FORECAST, SEVERAL PLACES')} title={t('Сравнение городов', 'Compare cities')} description={t('Сопоставьте актуальные условия в выбранных и избранных местах.', 'Compare current conditions for your selected and favorite places.')}/>{cities.length === 1 && <Panel><p>{t('Добавьте города в избранное через поиск, чтобы сравнить погоду.', 'Add cities to favorites using search to compare their weather.')}</p><Link className="button secondary" href="/favorites">{t('Открыть избранное', 'Open favorites')}</Link></Panel>}<div className="metric-grid">{cities.map(city => <CityWeather key={city.id} city={city} settings={settings} t={t}/>)}</div></>;
}

