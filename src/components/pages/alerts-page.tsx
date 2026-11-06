"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Bell, Info, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMeteora } from "@/components/providers";
import { PageHeading, Panel, SourceNote, State } from "@/components/ui";
import { fetchOfficialAlerts } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { buildInsights, formatTime } from "@/lib/weather";

export default function AlertsPage() {
  const { location, settings, setSettings, weather, t } = useMeteora();
  const official = useResource(`alerts:${location.latitude}:${location.longitude}`, () => fetchOfficialAlerts(location));
  const [notificationStatus, setNotificationStatus] = useState("");
  const [thresholds,setThresholds] = useState({snow:5,wind:14,change:10,rain:20,cooldown:12});
  useEffect(()=>{const timer=window.setTimeout(()=>{try{const saved=localStorage.getItem(`meteora.alerts.${location.id}`);if(saved)setThresholds({...{snow:5,wind:14,change:10,rain:20,cooldown:12},...JSON.parse(saved)});}catch{}},0);return()=>window.clearTimeout(timer);},[location.id]);
  const setThreshold=(key:keyof typeof thresholds,value:number)=>{const next={...thresholds,[key]:value};setThresholds(next);try{localStorage.setItem(`meteora.alerts.${location.id}`,JSON.stringify(next));}catch{}};
  const insights = weather.data ? buildInsights(weather.data, settings.language) : [];
  const weatherFlags = insights.filter(item => item.severity !== "info");
  const notify = async () => {
    if (!("Notification" in window) || !window.isSecureContext) {
      setNotificationStatus(t("Этот браузер не поддерживает уведомления страницы. Все предупреждения доступны здесь.", "This browser does not support page notifications. All alerts remain available here."));
      return;
    }
    try {
      const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (permission !== "granted") {
        setSettings({ notifications: false });
        setNotificationStatus(t("Разрешение не получено. Его можно изменить в настройках браузера.", "Permission was not granted. You can change it in your browser settings."));
        return;
      }
      const item = weatherFlags[0] ?? insights[0];
      if (!item) return;
      new Notification(`Meteora · ${location.name}`, { body: `${item.title}. ${item.body}`, tag: `meteora-summary-${location.id}` });
      setSettings({ notifications: true });
      setNotificationStatus(t("Сводка передана браузеру. Отображение зависит от настроек системы.", "The summary was sent to your browser. Display depends on system notification settings."));
    } catch {
      setNotificationStatus(t("Браузер не разрешил отправить уведомление. Сводка доступна на этой странице.", "Your browser could not display the notification. The summary is available on this page."));
    }
  };
  return <div className="stack">
    <PageHeading eyebrow={t("БУДЬТЕ В КУРСЕ", "STAY INFORMED")} title={t("Погодные предупреждения", "Weather alerts")} description={`${location.name} · ${t("Условия на улице и сообщения метеослужб", "Outdoor conditions and weather service notices")}`} action={<button className="button secondary" onClick={() => { official.refresh(); weather.refresh(); }} disabled={official.loading}><RefreshCw size={16}/>{t("Обновить", "Refresh")}</button>}/>
    <Panel>
      <div className="section-heading"><h2><ShieldCheck size={21}/>{t("Официальные сообщения", "Official notices")}</h2><span className="chip">NOAA / NWS</span></div>
      <State loading={official.loading && !official.data} error={official.error} retry={official.refresh}/>
      {official.data && !official.data.supported && <div className="notice"><Info size={20}/><p>{t("Для этой страны официальный канал предупреждений пока не подключён. Это не означает отсутствия опасных явлений. Проверяйте сообщения местной метеослужбы.", "An official alert feed is not connected for this country. This does not mean there are no hazards. Check your local weather service.")}</p></div>}
      {official.data?.supported && official.data.alerts.length === 0 && <State empty={t("NWS не вернул действующих предупреждений для этой точки на момент запроса.", "NWS returned no active alerts for this point at the time of this request.")}/>}
      {official.data?.alerts.map(alert => <article key={alert.id} className="alert-card">
        <div className="section-heading"><span className="chip"><TriangleAlert size={15}/>{alert.severity}</span><span className="muted">{alert.senderName}</span></div>
        <h3>{alert.headline || alert.event}</h3>
        <p className="muted">{t("Действует", "Effective")}: {alert.effective ? new Date(alert.effective).toLocaleString(settings.language, { timeZone: weather.data?.timezone ?? location.timezone ?? "UTC" }) : "—"} · {t("До", "Until")}: {alert.expires ? new Date(alert.expires).toLocaleString(settings.language, { timeZone: weather.data?.timezone ?? location.timezone ?? "UTC" }) : "—"}</p>
        <details><summary>{t("Текст метеослужбы и рекомендации", "Weather service text and instructions")}</summary><p style={{ whiteSpace: "pre-line" }}>{alert.description}</p>{alert.instruction && <p style={{ whiteSpace: "pre-line" }}>{alert.instruction}</p>}</details>
        <a className="text-link" href={alert.url} target="_blank" rel="noreferrer">{t("Открыть источник", "Open source")}<ArrowUpRight size={15}/></a>
      </article>)}
      <SourceNote><a href="https://www.weather.gov/documentation/services-web-api" target="_blank" rel="noreferrer">National Weather Service</a> · {t("Официальный канал охватывает США. Текст предупреждений сохраняется на языке источника.", "This official feed covers the United States. Alerts retain the source language.")}{official.data?.supported && <> · {t("Получено", "Fetched")} {new Date(official.data.fetchedAt).toLocaleString(settings.language)}</>}</SourceNote>
    </Panel>
    <Panel>
      <div className="section-heading"><h2><TriangleAlert size={21}/>{t("На что обратить внимание", "Conditions to watch")}</h2><span className="chip">{t("На основе прогноза", "Forecast based")}</span></div>
      <p className="muted">{t("Эти подсказки рассчитываются правилами по данным Open-Meteo. Они не являются официальными предупреждениями или прогнозом отдельной ИИ-модели.", "These suggestions use deterministic rules applied to Open-Meteo data. They are not official warnings or forecasts from a separate AI model.")}</p>
      <State loading={weather.loading && !weather.data} error={weather.error} retry={weather.refresh}/>
      {weather.data && <div className="grid-2">{insights.map(insight => <article className={`insight ${insight.severity}`} key={insight.id}><span className="overline">{insight.severity === "warning" ? <TriangleAlert size={17}/> : <Info size={17}/>}</span><h3>{insight.title}</h3><p>{insight.body}</p></article>)}</div>}
      {weather.data && <SourceNote>{t("Прогноз получен", "Forecast fetched")} {formatTime(Date.parse(weather.data.fetchedAt) / 1000, weather.data.timezone, settings.language)} · {weather.data.timezone} · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></SourceNote>}
    </Panel>
    <Panel><h2>Alerts Pro · {t('Личные пороги','Personal thresholds')}</h2><p className="muted">{t('Для выбранного города. Проверка при открытой странице; фоновые push-уведомления не подключены.','For the selected city. Evaluated while the page is open; background push is unavailable.')}</p><div className="grid-3" style={{marginTop:16}}>{([['snow','Сильный снег, см','Heavy snow, cm'],['wind','Сильный ветер, м/с','Strong wind, m/s'],['change','Изменение температуры, °C','Temperature change, °C'],['rain','Сильные осадки, мм','Heavy precipitation, mm'],['cooldown','Повтор через, часы','Repeat after, hours']] as const).map(([key,ru,en])=><label key={key}>{t(ru,en)}<input type="number" min={1} max={key==='cooldown'?168:100} value={thresholds[key]} onChange={e=>setThreshold(key,Math.max(1,Number(e.target.value)||1))}/></label>)}</div>{weather.data&&(()=>{const d=weather.data.daily,c=weather.data.current,h=weather.data.hourly;const temp=h.temperature_2m.slice(0,24).filter((v):v is number=>v!=null);const change=temp.length?Math.max(...temp)-Math.min(...temp):0;const code=c.weather_code??0;const flags=[d.snowfall_sum[0]!=null&&d.snowfall_sum[0]!>=thresholds.snow?'Сильный снег':null,c.wind_speed_10m!=null&&c.wind_speed_10m>=thresholds.wind?'Сильный ветер':null,change>=thresholds.change?'Резкое изменение температуры':null,d.precipitation_sum[0]!=null&&d.precipitation_sum[0]!>=thresholds.rain?'Сильные осадки':null,code>=95?'Гроза':null,c.temperature_2m!=null&&c.temperature_2m<=1&&c.precipitation!=null&&c.precipitation>0?'Возможный гололёд':null].filter(Boolean);return <div className="notice" style={{marginTop:18}}>{flags.length?flags.join(' · '):t('Пороговые условия сейчас не обнаружены.','No threshold conditions detected now.')}</div>})()}<SourceNote>{t('Автоматический расчёт по Open-Meteo, не официальное предупреждение. Возможный гололёд оценивается приблизительно.','Calculated from Open-Meteo, not an official warning. Ice risk is approximate.')}</SourceNote></Panel>
    <Panel><div className="section-heading"><h2><Bell size={21}/>{t("Уведомления браузера", "Browser notifications")}</h2></div><p className="muted">{t("Можно отправить текущую погодную сводку в уведомления вашего браузера. Требуется разрешение. Фоновая push-доставка при закрытом сайте не подключена.", "Send the current weather summary to your browser notifications. Permission is required. Background push delivery while the site is closed is not connected.")}</p><button className="button" onClick={() => void notify()} disabled={insights.length === 0}><Bell size={16}/>{t("Показать текущую сводку", "Notify me with this summary")}</button>{notificationStatus && <p role="status" className="notice">{notificationStatus}</p>}</Panel>
  </div>;
}
