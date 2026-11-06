'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PageHeading, Panel, Sparkline, State, SourceNote } from '../ui';
import { useMeteora } from '../providers';
import { currentHourIndex, formatTemp, formatTime, formatWind, formatPressure } from '@/lib/weather';
import type { HourlyWeather } from '@/lib/types';

const series: {key:keyof HourlyWeather; ru:string; en:string; unit:string}[] = [
  {key:'temperature_2m',ru:'Температура',en:'Temperature',unit:'°C'},
  {key:'apparent_temperature',ru:'Ощущается',en:'Feels like',unit:'°C'},
  {key:'relative_humidity_2m',ru:'Влажность',en:'Humidity',unit:'%'},
  {key:'pressure_msl',ru:'Давление',en:'Pressure',unit:'гПа'},
  {key:'wind_speed_10m',ru:'Ветер',en:'Wind',unit:'м/с'},
  {key:'wind_gusts_10m',ru:'Порывы',en:'Gusts',unit:'м/с'},
  {key:'precipitation',ru:'Осадки',en:'Precipitation',unit:'мм'},
];
export default function AnalyticsPage(){
  const {weather,location,settings,t}=useMeteora(); const [range,setRange]=useState(24); const [metric,setMetric]=useState<keyof HourlyWeather>('temperature_2m'); const data=weather.data;
  if(!data)return <><PageHeading eyebrow="METEORA ANALYTICS" title={t('Аналитика погоды','Weather analytics')} description={location.name}/><Panel><State loading={weather.loading} error={weather.error} retry={weather.refresh}/></Panel></>;
  const start=currentHourIndex(data), indices=data.hourly.time.slice(start,start+range).map((_,i)=>start+i), values=indices.map(i=>data.hourly[metric][i] as number|null).filter((x):x is number=>x!==null), info=series.find(x=>x.key===metric)!;
  const first=values[0],last=values.at(-1),difference=first==null||last==null?null:last-first;
  return <div className="stack"><PageHeading eyebrow="METEORA ANALYTICS" title={t('Аналитика погоды','Weather analytics')} description={`${location.name} · Open-Meteo`}/>
    <Panel><div className="section-heading"><h2>{t(info.ru,info.en)}</h2><div className="segmented">{[12,24,72,168].map(n=><button key={n} className={n===range?'selected':''} aria-pressed={n===range} onClick={()=>setRange(n)}>{n<24?`${n}ч`:`${n/24}д`}</button>)}</div></div>
      <div className="chip-row" style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:20}}>{series.map(s=><button key={s.key} className={`button ${metric===s.key?'':'secondary'}`} aria-pressed={metric===s.key} onClick={()=>setMetric(s.key)}>{t(s.ru,s.en)}</button>)}</div>
      {values.length>1?<Sparkline values={values} height={170}/>:<State empty={t('Недостаточно данных для графика','Not enough data for chart')}/>}
      <div className="grid-3"><div><small>{t('Начало','Start')}</small><h2>{first?.toFixed(1)??'—'} {info.unit}</h2></div><div><small>{t('Конец','End')}</small><h2>{last?.toFixed(1)??'—'} {info.unit}</h2></div><div><small>{t('Изменение','Change')}</small><h2>{difference==null?'—':`${difference>0?'+':''}${difference.toFixed(1)}`} {info.unit}</h2></div></div>
      <SourceNote>{t('Модельный почасовой прогноз, не прямые наблюдения.','Hourly model forecast, not direct measurements.')} {formatTime(Date.parse(data.fetchedAt)/1000,data.timezone,settings.language)} · {data.timezone}</SourceNote>
    </Panel>
    <div className="grid-3"><Panel><h3>{t('Сейчас','Now')}</h3><p>{formatTemp(data.current.temperature_2m,settings)} · {t('ощущается','feels')} {formatTemp(data.current.apparent_temperature,settings)}</p></Panel><Panel><h3>{t('Ветер и порывы','Wind and gusts')}</h3><p>{formatWind(data.current.wind_speed_10m,settings)} / {formatWind(data.current.wind_gusts_10m,settings)}</p></Panel><Panel><h3>{t('Давление и влажность','Pressure and humidity')}</h3><p>{formatPressure(data.current.pressure_msl,settings)} · {data.current.relative_humidity_2m??'—'}%</p></Panel></div>
    <Panel><h2>{t('Сравнение периодов','Compare periods')}</h2><p className="muted">{t('Сравнивайте интервалы по 12, 24, 72 часа и 7 дней. Исторический реанализ доступен в прогнозе. Климатические нормы не показываются без подтверждённого источника.','Compare 12, 24, 72 hours and 7 days. Historical reanalysis is available in Forecast. Climate normals require a verified source.')}</p><Link className="text-link" href="/forecast">{t('Открыть архив и прогноз →','Open archive and forecast →')}</Link></Panel>
  </div>;
}
