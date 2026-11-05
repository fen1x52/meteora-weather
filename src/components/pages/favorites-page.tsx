'use client';
import Link from 'next/link';
import { Heart, MapPin, Star } from 'lucide-react';
import { useMeteora } from '@/components/providers';
import { PageHeading, Panel } from '@/components/ui';
import type { Location } from '@/lib/types';
export default function FavoritesPage() {
  const { t, favorites, location, setLocation, toggleFavorite } = useMeteora();
  const select = (city: Location) => { setLocation(city); };
  return <><PageHeading eyebrow={t('ВАШИ МЕСТА', 'YOUR PLACES')} title={t('Избранное', 'Favorites')} description={t('Быстрый доступ к городам, за которыми вы следите.', 'Quick access to the places you follow.')}/>{favorites.length === 0 ? <Panel><div className="state"><Heart size={28}/><p>{t('Пока здесь пусто. Найдите город в строке поиска и добавьте его в избранное на карточке погоды.', 'Nothing here yet. Search for a city and add it to favorites from its weather card.')}</p><Link className="button secondary" href="/">{t('К обзору погоды', 'Go to weather overview')}</Link></div></Panel> : <div className="stack">{favorites.map(city => <Panel key={city.id}><div className="section-heading"><div><strong>{city.name}</strong><div className="muted small-text">{[city.admin1, city.country].filter(Boolean).join(' · ')}</div></div><div style={{ display: 'flex', gap: 8 }}><button className="button secondary" onClick={() => select(city)}><MapPin size={16}/>{location.id === city.id ? t('Выбрано', 'Selected') : t('Показать', 'Show')}</button><button className="icon-button" onClick={() => toggleFavorite(city)} aria-label={t(`Убрать ${city.name} из избранного`, `Remove ${city.name} from favorites`)}><Star size={18} fill="currentColor"/></button></div></div><p className="muted small-text">{city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°</p></Panel>)}</div>}<p className="muted small-text">{t('Добавляйте места кнопкой с сердцем на странице обзора.', 'Add places with the heart button on the overview page.')}</p></>;
}

