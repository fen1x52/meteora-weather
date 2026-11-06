"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Cloud, CloudRain, Crosshair, Layers, Pause, Play, Thermometer, Wind } from "lucide-react";
import { useMeteora } from "@/components/providers";
import { Metric, PageHeading, Panel, SourceNote, State } from "@/components/ui";
import { fetchRadar, fetchWeather } from "@/lib/api";
import { useResource } from "@/lib/use-resource";
import { formatTemp, formatTime, formatWind } from "@/lib/weather";
import type { Location } from "@/lib/types";

const WeatherMap = dynamic(() => import("@/components/weather-map"), { ssr: false, loading: () => <div className="skeleton" style={{ height: 450, borderRadius: 24 }} /> });
type Layer = "radar" | "temperature" | "wind" | "cloud" | "rain";

export default function MapsPage() {
  const { location, settings, t, setLocation } = useMeteora();
  const [point, setPoint] = useState<{ ownerId: string; location: Location } | null>(null);
  const [layer, setLayer] = useState<Layer>("radar");
  const [frameIndex, setFrameIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [coordinatesError, setCoordinatesError] = useState("");
  const activePoint = point?.ownerId === location.id ? point.location : null;
  const selected = activePoint ?? location;
  const radar = useResource("radar", fetchRadar);
  const forecast = useResource(`map-weather:${selected.latitude}:${selected.longitude}`, () => fetchWeather(selected));
  const frames = radar.data?.radar.past ?? [];
  useEffect(() => { if (!playing || frames.length < 2) return; const timer = window.setInterval(() => setFrameIndex(i => ((i ?? frames.length - 1) + 1) % frames.length), 850); return () => window.clearInterval(timer); }, [playing, frames.length]);
  const frame = frames[Math.min(frameIndex ?? frames.length - 1, frames.length - 1)];
  const current = forecast.data?.current;
  const zone = forecast.data?.timezone ?? selected.timezone ?? "UTC";
  const layers: { id: Layer; ru: string; en: string; icon: typeof Cloud }[] = [
    { id: "radar", ru: "Радар осадков", en: "Rain radar", icon: Layers },
    { id: "temperature", ru: "Температура", en: "Temperature", icon: Thermometer },
    { id: "wind", ru: "Ветер", en: "Wind", icon: Wind },
    { id: "cloud", ru: "Облачность", en: "Cloud cover", icon: Cloud },
    { id: "rain", ru: "Осадки", en: "Precipitation", icon: CloudRain },
  ];
  const pointValue = !current ? undefined : layer === "wind" ? formatWind(current.wind_speed_10m, settings)
    : layer === "cloud" ? `${current.cloud_cover ?? "—"}%`
      : layer === "rain" ? `${current.precipitation ?? "—"} ${t("мм", "mm")}` : formatTemp(current.temperature_2m, settings);
  function pick(latitude: number, longitude: number) {
    setPoint({ ownerId: location.id, location: { id: `point:${latitude.toFixed(4)}:${longitude.toFixed(4)}`, name: t("Точка на карте", "Map location"), country: "", latitude, longitude } });
  }

  return <div className="stack">
    <PageHeading eyebrow={t("АТЛАС METEORA", "METEORA ATLAS")} title={t("Погода на карте", "Weather on the map")} description={t("Посмотрите на погоду шире. Выберите слой и исследуйте любую точку мира.", "Get the bigger picture. Choose a layer and explore any location.")} action={<button className="button secondary" onClick={() => setPoint(null)}><Crosshair size={17} />{t("К моему городу", "My city")}</button>} />
    <div className="chip-row" role="group" aria-label={t("Погодные слои", "Weather layers")} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {layers.map(({ id, ru, en, icon: Icon }) => <button key={id} className={`button ${layer === id ? "" : "secondary"}`} aria-pressed={layer === id} onClick={() => setLayer(id)}><Icon size={17} />{t(ru, en)}</button>)}
    </div>
    <Panel>
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div><h2 className="section-title">{layer === "radar" ? t("Последние 2 часа · радар", "Past 2 hours · radar") : t("Модельные данные в выбранной точке", "Model data at the selected location")}</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>{layer === "radar" ? t("Реальные радарные кадры. Отсутствие цвета может означать отсутствие покрытия.", "Actual radar frames. No color may also mean no radar coverage.") : t("Нажмите на карту: показания относятся только к выбранной точке, не ко всей территории.", "Click the map: values apply to the selected point only, not the entire area.")}</p></div>
        {frame && layer === "radar" && <span className="chip">{formatTime(frame.time, zone, settings.language)} · {zone}</span>}
      </div>
      {layer === "radar" && <State loading={radar.loading && !radar.data} error={radar.error} retry={radar.refresh} />}
      <WeatherMap latitude={selected.latitude} longitude={selected.longitude} label={t("Интерактивная карта погоды", "Interactive weather map")} onPick={pick} selectedValue={pointValue}
        radarUrl={layer === "radar" && frame && radar.data ? `${radar.data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png` : undefined}
        tileErrorLabel={t("Часть картографических тайлов недоступна. Данные выбранной точки доступны ниже.", "Some map tiles are unavailable. Selected location data remains available below.")} />
      {layer === "radar" && frames.length > 0 && <div style={{ marginTop: 20 }}>
        <button className="button secondary" onClick={() => setPlaying(!playing)} aria-label={playing ? t('Остановить радар', 'Pause radar') : t('Запустить радар', 'Play radar')}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? t('Пауза','Pause') : t('Анимация','Animate')}</button>
        <label htmlFor="radar-time" className="muted">{t("Время радарного кадра", "Radar frame time")}: {frame && formatTime(frame.time, zone, settings.language)}</label>
        <input id="radar-time" type="range" min={0} max={frames.length - 1} step={1} value={Math.min(frameIndex ?? frames.length - 1, frames.length - 1)} onChange={(event) => setFrameIndex(Number(event.target.value))} style={{ width: "100%", accentColor: "var(--accent, #6963e8)", margin: "12px 0" }} />
        <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}><span>{formatTime(frames[0].time, zone, settings.language)}</span><span>{t("Последний кадр", "Latest frame")}</span></div>
      </div>}
      <SourceNote>{layer === "radar" ? <><a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">Weather data by RainViewer</a> · {t("Время кадра — время его формирования. Покрытие зависит от радарной сети; увеличение выше z7 не добавляет детализации.", "Frame times indicate generation time. Coverage depends on the radar network; zooming beyond z7 adds no detail.")}</> : <>{t("Сплошной слой температуры, ветра или облачности не подключён. На карте отображаются реальные точечные данные Open-Meteo.", "Continuous temperature, wind, and cloud tiles are not connected. The map displays actual Open-Meteo point data.")}</>}</SourceNote>
    </Panel>
    <div className="grid-2">
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}><div><h2 className="section-title">{selected.name}</h2><p className="muted">{selected.latitude.toFixed(4)}°, {selected.longitude.toFixed(4)}°</p></div>{activePoint && <button className="button secondary" onClick={() => setLocation({ ...selected, timezone: zone })}>{t("Выбрать место", "Use location")}</button>}</div>
        <State loading={forecast.loading && !forecast.data} error={forecast.error} retry={forecast.refresh} />
        {current && <div className="grid-2"><Metric icon={<Thermometer size={19} />} label={t("Температура", "Temperature")} value={formatTemp(current.temperature_2m, settings)} /><Metric icon={<Wind size={19} />} label={t("Ветер", "Wind")} value={formatWind(current.wind_speed_10m, settings)} /><Metric icon={<Cloud size={19} />} label={t("Облачность", "Cloud cover")} value={`${current.cloud_cover ?? "—"}%`} /><Metric icon={<CloudRain size={19} />} label={t("Осадки", "Precipitation")} value={`${current.precipitation ?? "—"} ${t("мм", "mm")}`} detail={t("За интервал модели", "Model interval total")} /></div>}
        {forecast.data && <SourceNote>Open-Meteo · {t("Модельная оценка на", "Model estimate for")} {formatTime(forecast.data.current.time, zone, settings.language)} · {zone}. {t("Получено", "Fetched")} {new Date(forecast.data.fetchedAt).toLocaleTimeString(settings.language === "ru" ? "ru-RU" : "en-GB")}</SourceNote>}
      </Panel>
      <Panel><h2 className="section-title">{t("Точные координаты", "Exact coordinates")}</h2><p className="muted">{t("Выберите место с клавиатуры или укажите координаты вручную.", "Select a location with your keyboard or enter coordinates manually.")}</p>
        <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const lat = Number(form.get("latitude")); const lon = Number(form.get("longitude")); if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { setCoordinatesError(t("Проверьте диапазон координат.", "Please check the coordinate ranges.")); return; } setCoordinatesError(""); pick(lat, lon); }} className="stack" style={{ gap: 14 }}>
          <label>{t("Широта", "Latitude")}<input className="input" name="latitude" type="number" min={-90} max={90} step="any" required placeholder="55.7558" aria-label={t("Широта от −90 до 90", "Latitude from −90 to 90")} /></label>
          <label>{t("Долгота", "Longitude")}<input className="input" name="longitude" type="number" min={-180} max={180} step="any" required placeholder="37.6173" aria-label={t("Долгота от −180 до 180", "Longitude from −180 to 180")} /></label>
          {coordinatesError && <p role="alert">{coordinatesError}</p>}
          <button className="button" type="submit"><Crosshair size={17} />{t("Показать точку", "Show location")}</button>
        </form>
      </Panel>
    </div>
  </div>;
}
