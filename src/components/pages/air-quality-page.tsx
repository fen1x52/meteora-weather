"use client";

import { useState } from "react";
import { Activity, ArrowUpRight, Leaf, RefreshCw, Wind } from "lucide-react";
import { useMeteora } from "@/components/providers";
import { Metric, PageHeading, Panel, SourceNote, State } from "@/components/ui";
import { fetchAirQuality } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatTime } from "@/lib/weather";
import type { AirValues } from "@/lib/types";

const colors = ["#36aa8b", "#7b9e3e", "#c88b31", "#dc6c46", "#bc5291", "#8e4a87"];
function category(value: number, scale: "european_aqi" | "us_aqi") {
  const thresholds = scale === "european_aqi" ? [20, 40, 60, 80, 100] : [50, 100, 150, 200, 300];
  const result = thresholds.findIndex((threshold) => value <= threshold);
  return result === -1 ? 5 : result;
}

export default function AirQualityPage() {
  const { location, settings, t } = useMeteora();
  const [scale, setScale] = useState<"european_aqi" | "us_aqi">("european_aqi");
  const resource = useResource(`air:${location.latitude}:${location.longitude}`, () => fetchAirQuality(location));
  const data = resource.data;
  const index = data?.current[scale] ?? null;
  const level = index === null ? null : category(index, scale);
  const labels = scale === "european_aqi"
    ? [t("Хороший", "Good"), t("Приемлемый", "Fair"), t("Умеренный", "Moderate"), t("Плохой", "Poor"), t("Очень плохой", "Very poor"), t("Крайне плохой", "Extremely poor")]
    : [t("Хороший", "Good"), t("Умеренный", "Moderate"), t("Нездоровый для чувствительных групп", "Unhealthy for sensitive groups"), t("Нездоровый", "Unhealthy"), t("Очень нездоровый", "Very unhealthy"), t("Опасный", "Hazardous")];
  const pollutants: { key: keyof AirValues; title: string; description: string }[] = [
    { key: "pm2_5", title: "PM₂.₅", description: t("Мелкодисперсные частицы", "Fine particles") },
    { key: "pm10", title: "PM₁₀", description: t("Взвешенные частицы", "Coarse particles") },
    { key: "nitrogen_dioxide", title: "NO₂", description: t("Диоксид азота", "Nitrogen dioxide") },
    { key: "ozone", title: "O₃", description: t("Приземный озон", "Ground-level ozone") },
    { key: "sulphur_dioxide", title: "SO₂", description: t("Диоксид серы", "Sulphur dioxide") },
    { key: "carbon_monoxide", title: "CO", description: t("Угарный газ", "Carbon monoxide") },
  ];
  const nextHours = data?.hourly.time.map((time, index) => ({ time, index })).filter(({ time }) => time >= data.current.time - 3600).slice(0, 24) ?? [];
  const recommendation = level === null ? t("В этой точке индекс пока недоступен.", "No air quality index is available for this location.")
    : level <= 1 ? t("Условия обычно подходят для прогулки. Если вы чувствительны к загрязнению, ориентируйтесь также на самочувствие и местные рекомендации.", "Conditions are generally suitable for outdoor activities. If you are sensitive to air pollution, also consider how you feel and local guidance.")
      : level <= 3 ? t("Сократите интенсивные и продолжительные нагрузки на улице, особенно если вы чувствительны к загрязнению воздуха. Следите за местными рекомендациями.", "Consider reducing prolonged, strenuous outdoor activity, especially if you are sensitive to air pollution. Follow local guidance.")
        : t("Ограничьте пребывание и интенсивные нагрузки на улице. Проверьте официальные местные рекомендации по качеству воздуха.", "Limit outdoor exposure and strenuous activity. Check official local air quality guidance.");

  return <div className="stack">
    <PageHeading eyebrow={t("АТМОСФЕРА", "ATMOSPHERE")} title={t("Дышите осознанно", "Know the air around you")} description={`${location.name} · ${t("Состав воздуха и модельный прогноз загрязнения", "Air composition and pollution forecast")}`} action={<button className="button secondary" onClick={resource.refresh} disabled={resource.loading}><RefreshCw size={16} />{t("Обновить", "Refresh")}</button>} />
    <State loading={resource.loading && !data} error={resource.error} retry={resource.refresh} />
    {data && <>
      <div className="grid-2">
        <Panel className="air-hero">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span className="chip"><Leaf size={14} />{t("Индекс качества воздуха", "Air quality index")}</span><div role="group" aria-label={t("Шкала индекса", "Index scale")} style={{ display: "flex", gap: 6 }}>{(["european_aqi", "us_aqi"] as const).map((item) => <button key={item} className={`button ${scale === item ? "" : "secondary"}`} aria-pressed={scale === item} onClick={() => setScale(item)} style={{ padding: "8px 12px", fontSize: 12 }}>{item === "european_aqi" ? "EU AQI" : "US AQI"}</button>)}</div></div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26, padding: "30px 0", flexWrap: "wrap" }}>
            <div style={{ width: 168, height: 168, borderRadius: "50%", display: "grid", placeItems: "center", border: `12px solid ${level === null ? "#c7cbd5" : `${colors[level]}55`}`, color: level === null ? "inherit" : colors[level], background: level === null ? "transparent" : `${colors[level]}0c` }}><span style={{ fontSize: 62, fontWeight: 500, lineHeight: 1, letterSpacing: -4 }}>{index === null ? "—" : Math.round(index)}</span></div>
            <div><h2 style={{ fontSize: 26, margin: "0 0 10px", maxWidth: 240 }}>{level === null ? t("Нет данных", "No data") : labels[level]}</h2><p className="muted">{scale === "european_aqi" ? t("Европейская шкала AQI", "European AQI scale") : t("Американская шкала AQI", "United States AQI scale")}</p><span className="chip">{formatTime(data.current.time, data.timezone, settings.language)} · {data.timezone}</span></div>
          </div>
          <div style={{ display: "flex", gap: 4, height: 7 }} aria-hidden="true">{colors.map((color) => <span key={color} style={{ flex: 1, borderRadius: 9, background: color }} />)}</div><div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 8 }}><span>{t("Чистый воздух", "Cleaner air")}</span><span>{t("Высокое загрязнение", "Higher pollution")}</span></div>
          <SourceNote>{t("Модельная оценка CAMS, а не показания локального датчика.", "A CAMS model estimate, not a local sensor reading.")}</SourceNote>
        </Panel>
        <Panel><div className="chip"><Wind size={16} />{t("На свежем воздухе", "Time outdoors")}</div><h2 style={{ fontSize: 28, lineHeight: 1.25, margin: "24px 0 14px" }}>{level !== null && level <= 1 ? t("Время для прогулки", "A moment outdoors") : t("Планируйте с учётом воздуха", "Plan around the air quality")}</h2><p style={{ lineHeight: 1.75 }}>{recommendation}</p><p className="muted" style={{ lineHeight: 1.65 }}>{t("Индекс описывает загрязнение воздуха в целом. Европейская и американская шкалы используют разные пороги и периоды усреднения — их числа нельзя напрямую сравнивать.", "The index describes overall air pollution. EU and US scales use different thresholds and averaging periods, so their values are not directly comparable.")}</p><a className="text-link" href="https://www.airnow.gov/aqi/aqi-basics/" target="_blank" rel="noreferrer">{t("Как понимать AQI", "Understanding AQI")} <ArrowUpRight size={15} /></a></Panel>
      </div>
      <div><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><Activity size={20} /><h2 className="section-title">{t("Что в воздухе", "What is in the air")}</h2></div><div className="grid-3">{pollutants.map(({ key, title, description }) => <Panel key={key}><Metric label={title} value={data.current[key] === null ? "—" : `${data.current[key]?.toFixed(1)} ${t("мкг/м³", "µg/m³")}`} detail={description} /></Panel>)}</div></div>
      <Panel><h2 className="section-title">{t("Ближайшие 24 часа", "The next 24 hours")}</h2><p className="muted">{t("Почасовой прогноз CAMS", "Hourly CAMS forecast")} · {scale === "european_aqi" ? "EU AQI" : "US AQI"} · {data.timezone}</p><div style={{ overflowX: "auto", paddingBottom: 8 }} tabIndex={0} role="region" aria-label={t("Почасовой прогноз качества воздуха", "Hourly air quality forecast")}><div style={{ display: "grid", gridTemplateColumns: `repeat(${nextHours.length}, 70px)`, gap: 9 }}>{nextHours.map(({ time, index: hourIndex }) => { const value = data.hourly[scale][hourIndex]; return <div key={time} style={{ textAlign: "center", padding: "12px 7px", borderRadius: 16, background: "var(--surface-soft, #f4f5fa)" }}><span className="muted" style={{ fontSize: 12 }}>{formatTime(time, data.timezone, settings.language)}</span><div style={{ height: 84, display: "flex", flexDirection: "column", justifyContent: "end", alignItems: "center", padding: "10px 0" }}>{value !== null && value !== undefined && <div style={{ width: 23, height: Math.max(5, Math.min(64, value / (scale === "european_aqi" ? 120 : 300) * 64)), background: colors[category(value, scale)], borderRadius: 7 }} />}</div><strong>{value === null || value === undefined ? "—" : Math.round(value)}</strong></div>; })}</div></div><SourceNote>{t("Получено", "Fetched")} {new Date(data.fetchedAt).toLocaleString(settings.language === "ru" ? "ru-RU" : "en-GB", { timeZone: data.timezone })} · <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">Open-Meteo</a> · <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noreferrer">CAMS ENSEMBLE / CAMS global</a>. {t("«—» означает, что источник не предоставил показатель.", "“—” means the source did not provide a value.")}</SourceNote></Panel>
    </>}
  </div>;
}

