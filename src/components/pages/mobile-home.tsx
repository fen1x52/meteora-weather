'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CalendarDays, ChartNoAxesColumn, Cloud, CloudSun, Droplets, Gauge, Home, Map, MapPin, Menu, Radar, Search, Settings2, Wind } from 'lucide-react';
import { useMeteora } from '../providers';
import { WeatherIcon } from '../ui';
import { currentHourIndex, formatTemp, formatTime, weatherLabel } from '@/lib/weather';
import type { WeatherData } from '@/lib/types';

export function MobileHome({ data }: { data: WeatherData }) {
  const { location, settings, t } = useMeteora();
  const [tab, setTab] = useState<'hours'|'days'|'charts'>('hours');
  const [selected, setSelected] = useState(0);
  const [menu, setMenu] = useState(false);
  const start = currentHourIndex(data);
  const hours = data.hourly.time.slice(start, start + 12);
  const current = data.current;
  const nav = [
    {href:'/', label:t('Главная','Home'), Icon:Home}, {href:'/maps',label:t('Карты','Maps'),Icon:Map},
    {href:'/maps',label:t('Радар','Radar'),Icon:Radar}, {href:'/analytics',label:t('Аналитика','Analytics'),Icon:ChartNoAxesColumn},
    {href:'/settings',label:t('Настройки','Settings'),Icon:Settings2},
  ];
  return <div className="meteora-mobile-home">
    <div className="mm-head"><div className="mm-brand"><Cloud size={41}/><div><strong>Meteora <small>v2.0.0</small></strong><span>{t('Погода, карты и прогнозы','Weather, maps and forecasts')}</span></div></div><div className="mm-actions"><button aria-label={t('Поиск','Search')} onClick={() => document.querySelector<HTMLInputElement>('.city-search input')?.focus()}><Search/></button><button aria-label={t('Открыть меню','Open menu')} aria-expanded={menu} onClick={() => setMenu(!menu)}><Menu/></button></div></div>
    {menu && <div className="mm-menu">{nav.map(({href,label,Icon},i)=><Link href={href} key={i} onClick={()=>setMenu(false)}><Icon size={18}/>{label}</Link>)}<Link href="/forecast" onClick={()=>setMenu(false)}>{t('Прогноз','Forecast')}</Link><Link href="/alerts" onClick={()=>setMenu(false)}>{t('Предупреждения','Alerts')}</Link><Link href="/astronomy" onClick={()=>setMenu(false)}>{t('Астрономия','Astronomy')}</Link><Link href="/nature" onClick={()=>setMenu(false)}>{t('Природа','Nature')}</Link><Link href="/air-quality" onClick={()=>setMenu(false)}>{t('Воздух','Air quality')}</Link><Link href="/favorites" onClick={()=>setMenu(false)}>{t('Избранное','Favorites')}</Link></div>}
    <button className="mm-location" onClick={() => document.querySelector<HTMLInputElement>('.city-search input')?.focus()}><MapPin size={20}/>{location.name}<span>⌄</span></button>
    <div className="mm-hero"><div className="mm-hero-label">{t('Сейчас','Now')}</div><div className="mm-hero-temp">{formatTemp(current.temperature_2m,settings)}</div><div className="mm-hero-art" aria-hidden="true"><div className="mm-moon"/><div className="mm-cloud">☁</div></div><h1>{weatherLabel(current.weather_code,settings.language)}</h1><p>{t('Ощущается как','Feels like')} {formatTemp(current.apparent_temperature,settings)}</p></div>
    <div className="mm-metrics"><div><Droplets/><span>{t('Влажность','Humidity')}</span><strong>{current.relative_humidity_2m ?? '—'}%</strong></div><div><Wind/><span>{t('Ветер','Wind')}</span><strong>{current.wind_speed_10m ?? '—'} м/с</strong></div><div><CloudSun/><span>{t('Осадки','Rain')}</span><strong>{data.daily.precipitation_probability_max[0] ?? '—'}%</strong></div><div><Gauge/><span>{t('Давление','Pressure')}</span><strong>{current.pressure_msl == null ? '—' : Math.round(current.pressure_msl*.75006)} мм</strong></div></div>
    <div className="mm-tabs"><button className={tab==='hours'?'active':''} onClick={()=>setTab('hours')}>◷  {t('По часам','Hourly')}</button><button className={tab==='days'?'active':''} onClick={()=>setTab('days')}><CalendarDays size={18}/> {t('По дням','Daily')}</button><button className={tab==='charts'?'active':''} onClick={()=>setTab('charts')}><ChartNoAxesColumn size={18}/> {t('Графики','Charts')}</button></div>
    {tab==='hours' && <div className="mm-hours">{hours.map((time,j)=>{const i=start+j;return <button className={selected===j?'active':''} key={time} onClick={()=>setSelected(j)}><span>{formatTime(time,data.timezone,settings.language)}</span><WeatherIcon code={data.hourly.weather_code[i]} size={27}/><strong>{formatTemp(data.hourly.temperature_2m[i],settings)}</strong><small>♧ {data.hourly.precipitation_probability[i] ?? '—'}%</small></button>})}</div>}
    {tab==='days' && <div className="mm-days">{data.daily.time.slice(0,7).map((time,i)=><div key={time}><span>{i===0?t('Сегодня','Today'):new Date(time*1000).toLocaleDateString(settings.language,{weekday:'short',day:'numeric',timeZone:data.timezone})}</span><WeatherIcon code={data.daily.weather_code[i]} size={23}/><strong>{formatTemp(data.daily.temperature_2m_min[i],settings)} / {formatTemp(data.daily.temperature_2m_max[i],settings)}</strong><small>♧ {data.daily.precipitation_probability_max[i] ?? '—'}%</small></div>)}</div>}
    {tab==='charts' && <div className="mm-chart"><div>{t('Температура на ближайшие часы','Temperature over the next hours')}</div><div className="mm-bars">{hours.map((time,j)=><span key={time} style={{height:`${Math.max(10,45+(data.hourly.temperature_2m[start+j]??0)*3)}%`}} title={formatTemp(data.hourly.temperature_2m[start+j],settings)}/>)}</div><Link href="/analytics">{t('Подробная аналитика →','Detailed analytics →')}</Link></div>}
    <Link className="mm-week" href="/forecast"><CalendarDays/>{t('На неделю','This week')}<span>›</span></Link>
    <div className="mm-days mm-week-preview">{data.daily.time.slice(0,4).map((time,i)=><div key={time}><span>{i===0?t('Сегодня','Today'):new Date(time*1000).toLocaleDateString(settings.language,{month:'2-digit',day:'2-digit',timeZone:data.timezone})}</span><WeatherIcon code={data.daily.weather_code[i]} size={23}/><strong>{formatTemp(data.daily.temperature_2m_min[i],settings)} / {formatTemp(data.daily.temperature_2m_max[i],settings)}</strong><small>♧ {data.daily.precipitation_probability_max[i] ?? '—'}%</small></div>)}</div>
    <div className="mm-bottom">{nav.map(({href,label,Icon},i)=><Link href={href} key={i} className={i===0?'active':''}><Icon size={23}/><span>{label}</span></Link>)}</div>
  </div>;
}
