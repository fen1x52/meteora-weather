'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowUpRight, Bell, ChevronRight, CloudSun, Compass, Earth, Heart, LayoutDashboard, Map, Menu, MoonStar, Settings2, Sparkles, Sun, Wind, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CitySearch } from './city-search';
import { useMeteora } from './providers';
import { buildInsights } from '@/lib/weather';
const navigation = [
  { href: '/', ru: 'Обзор погоды', en: 'Overview', icon: LayoutDashboard },
  { href: '/forecast', ru: 'Прогноз', en: 'Forecast', icon: CloudSun },
  { href: '/maps', ru: 'Карта погоды', en: 'Weather map', icon: Map },
  { href: '/air-quality', ru: 'Качество воздуха', en: 'Air quality', icon: Wind },
  { href: '/astronomy', ru: 'Астрономия', en: 'Astronomy', icon: MoonStar },
  { href: '/nature', ru: 'Природные явления', en: 'Natural events', icon: Earth },
  { href: '/compare', ru: 'Сравнение городов', en: 'Compare cities', icon: Activity },
  { href: '/favorites', ru: 'Избранное', en: 'Favorites', icon: Heart },
  { href: '/alerts', ru: 'Предупреждения', en: 'Alerts', icon: Bell },
  { href: '/analytics', ru: 'Аналитика', en: 'Analytics', icon: Activity },
  { href: '/timeline', ru: 'Лента погоды', en: 'Timeline', icon: Compass },
  { href: '/day-score', ru: 'Оценка дня', en: 'Day score', icon: Sparkles },
];
function NotificationWatcher() {
  const { settings, location, weather } = useMeteora();
  useEffect(() => {
    if (!settings.notifications || !weather.data || !('Notification' in window) || Notification.permission !== 'granted') return;
    const insight = buildInsights(weather.data, settings.language).find(i => i.severity === 'warning');
    if (!insight) return;
    const key = `meteora.notice:${location.id}:${insight.id}:${weather.data.daily.time[0]}`;
    try { if (sessionStorage.getItem(key)) return; new Notification(`Meteora · ${location.name}`, { body: `${insight.title}. ${insight.body}`, tag: key, icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon.svg` }); sessionStorage.setItem(key, '1'); } catch { /* Some mobile browsers require a push service; alerts remain visible in-app. */ }
  }, [settings.notifications, settings.language, location.id, location.name, weather.data]);
  return null;
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const { t, location, settings, setSettings } = useMeteora(); const [menu, setMenu] = useState(false);
  useEffect(() => { if (!menu) return; const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, [menu]);
  const active = navigation.find(n => n.href === path || n.href + '/' === path);
  return <div className="app-shell"><a href="#main-content" className="skip-link">{t('Перейти к содержимому', 'Skip to content')}</a><NotificationWatcher/>{menu && <button className="mobile-backdrop" aria-label={t('Закрыть меню', 'Close menu')} onClick={() => setMenu(false)}/>}<aside className={`sidebar ${menu ? 'is-open' : ''}`}><Link href="/" className="brand" onClick={() => setMenu(false)}><span className="brand-mark"><Sun size={27}/></span><span>meteora<span className="brand-dot">.</span></span></Link><button className="icon-button close-menu" aria-label={t('Закрыть меню', 'Close menu')} onClick={() => setMenu(false)}><X size={20}/></button><div className="nav-caption">{t('ИССЛЕДУЙТЕ МИР', 'EXPLORE YOUR WORLD')}</div><nav aria-label={t('Основная навигация', 'Main navigation')}>{navigation.map(({ href, ru, en, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenu(false)} className={`nav-link ${active?.href === href ? 'active' : ''}`} aria-current={active?.href === href ? 'page' : undefined}><Icon size={19}/><span>{t(ru, en)}</span>{active?.href === href && <span className="nav-active-dot"/>}</Link>)}</nav><div className="sidebar-bottom"><div className="world-card"><Compass size={27}/><strong>{t('Мир меняется.', 'The world moves.')}</strong><p>{t('Будьте с ним на одной волне.', 'Stay in tune with it.')}</p><Link href="/nature" onClick={() => setMenu(false)}>{t('Что происходит', 'Explore events')}<ArrowUpRight size={16}/></Link></div><Link href="/settings" onClick={() => setMenu(false)} className={`nav-link ${path.startsWith('/settings') ? 'active' : ''}`} aria-current={path.startsWith('/settings') ? 'page' : undefined}><Settings2 size={19}/><span>{t('Настройки', 'Settings')}</span></Link><div className="sidebar-version"><span className="status-dot"/>Meteora 2.0.0 <span>Web</span></div></div></aside><div className="app-content"><header className="topbar"><div className="breadcrumb"><button className="icon-button menu-toggle" aria-label={t('Открыть меню', 'Open navigation')} aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu size={22}/></button><span className="desktop-only">Meteora</span><ChevronRight size={14} className="desktop-only"/><strong>{active ? t(active.ru, active.en) : t('Настройки', 'Settings')}</strong></div><CitySearch/><div className="topbar-actions"><button className="icon-button theme-button" onClick={() => setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} aria-label={t('Переключить тему', 'Toggle theme')}><Sun size={20}/></button><Link href="/alerts" className="icon-button" aria-label={t('Предупреждения', 'Alerts')}><Bell size={20}/></Link><span className="avatar" aria-hidden="true"><Sparkles size={19}/></span></div></header><main id="main-content" tabIndex={-1}><AnimatePresence mode="wait"><motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>{children}</motion.div></AnimatePresence></main><footer className="site-footer"><span>© Meteora · {t('Наблюдайте. Исследуйте. Планируйте.', 'Observe. Explore. Plan.')}</span><span>{location.name} <span aria-hidden="true">·</span> <Link href="/settings">{t('Источники и настройки', 'Sources & settings')}</Link></span></footer></div></div>;
}

