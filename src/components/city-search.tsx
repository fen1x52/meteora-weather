'use client';
import { useEffect, useRef, useState } from 'react';
import { Clock3, LoaderCircle, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { fetchLocations } from '@/lib/api';
import type { Location } from '@/lib/types';
import { useMeteora } from './providers';
export function CitySearch({ onSelect, compact = false }: { onSelect?: (location: Location) => void; compact?: boolean }) {
  const { t, settings, recent, setLocation } = useMeteora();
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Location[]>([]);
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [active, setActive] = useState(-1);
  const root = useRef<HTMLDivElement>(null); const request = useRef(0);
  useEffect(() => {
    const id = ++request.current;
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try { const found = await fetchLocations(query, settings.language); if (request.current === id) setResults(found); }
      catch { if (request.current === id) setError(t('Поиск недоступен. Повторите запрос.', 'Search unavailable. Try again.')); }
      finally { if (request.current === id) setLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  // The localized error follows language; t is a convenience function recreated by provider.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, settings.language]);
  useEffect(() => { const fn = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', fn); return () => document.removeEventListener('pointerdown', fn); }, []);
  const choose = (city: Location) => { ++request.current; (onSelect || setLocation)(city); setQuery(''); setLoading(false); setOpen(false); setActive(-1); setError(''); };
  const list = query.trim().length >= 2 ? results : recent;
  const locate = () => {
    if (!navigator.geolocation) { setError(t('Геолокация не поддерживается.', 'Geolocation is not supported.')); setOpen(true); return; }
    setLoading(true); setError(''); setOpen(true);
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude, longitude } = pos.coords;
      choose({ id: `geo:${latitude.toFixed(3)}:${longitude.toFixed(3)}`, name: t('Моё местоположение', 'My location'), country: `${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°`, latitude, longitude }); setLoading(false);
    }, e => { setLoading(false); setError(e.code === 1 ? t('Разрешите доступ к геопозиции в браузере или выберите город.', 'Allow location access in your browser or select a city.') : t('Не удалось определить геопозицию.', 'Could not determine your location.')); }, { timeout: 12000, maximumAge: 300000 });
  };
  return <div className={`city-search ${compact ? 'compact' : ''}`} ref={root} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}><div className="search-field"><Search size={19}/><input aria-label={t('Поиск города', 'Search city')} placeholder={t('Город, страна или место', 'City, country or place')} value={query} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={compact ? 'city-options-compact' : 'city-options'} aria-activedescendant={active >= 0 ? `${compact ? 'compact-' : ''}city-${active}` : undefined} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); setResults([]); setActive(-1); setOpen(true); setLoading(e.target.value.trim().length >= 2); }} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(n => Math.min(n + 1, list.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setActive(n => Math.max(n - 1, 0)); } if (e.key === 'Enter' && active >= 0 && list[active]) { e.preventDefault(); choose(list[active]); } }}/>{loading ? <LoaderCircle className="spin" size={17}/> : query && <button className="icon-button small" aria-label={t('Очистить поиск', 'Clear search')} onClick={() => { setQuery(''); setResults([]); }}><X size={16}/></button>}<button className="icon-button locate" title={t('Определить местоположение', 'Use my location')} aria-label={t('Определить местоположение', 'Use my location')} onClick={locate}><LocateFixed size={19}/></button></div>{open && <div className="search-dropdown"><div className="dropdown-label">{query.length < 2 ? t('Недавние места', 'Recent places') : t('Результаты поиска', 'Search results')}</div>{error && <p className="search-message" role="alert">{error}</p>}<ul role="listbox" id={compact ? 'city-options-compact' : 'city-options'} aria-label={t('Города', 'Cities')}>{list.map((city, i) => <li key={city.id} id={`${compact ? 'compact-' : ''}city-${i}`} role="option" aria-selected={i === active}><button className={i === active ? 'selected' : ''} onMouseDown={e => e.preventDefault()} onClick={() => choose(city)}>{query.length < 2 ? <Clock3 size={17}/> : <MapPin size={17}/>}<span><strong>{city.name}</strong><small>{[city.admin1, city.country].filter(Boolean).join(', ')} · {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°</small></span></button></li>)}</ul>{!loading && !error && list.length === 0 && <p className="search-message">{query.length < 2 ? t('Введите хотя бы 2 символа. Поиск по всему миру.', 'Type at least 2 characters. Search worldwide.') : t('Ничего не найдено. Уточните название.', 'No cities found. Try another name.')}</p>}</div>}</div>;
}

