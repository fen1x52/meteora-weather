"use client";

import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";

export interface MapEvent {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color?: string;
  url?: string;
}

interface WeatherMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  label: string;
  onPick?: (latitude: number, longitude: number) => void;
  radarUrl?: string;
  events?: MapEvent[];
  selectedValue?: string;
  tileErrorLabel?: string;
}

export default function WeatherMap({ latitude, longitude, zoom = 6, label, onPick, radarUrl, events, selectedValue, tileErrorLabel = "Map tiles are temporarily unavailable." }: WeatherMapProps) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const initial = useRef({ latitude, longitude, zoom });
  const onPickRef = useRef(onPick);
  const [baseFailed, setBaseFailed] = useState(false);
  const [radarFailed, setRadarFailed] = useState(false);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    if (!element.current) return;
    const center = initial.current;
    const instance = L.map(element.current, { zoomControl: true, scrollWheelZoom: false, worldCopyJump: true })
      .setView([center.latitude, center.longitude], center.zoom);
    map.current = instance;
    let baseErrorCount = 0;
    const base = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom: 2, maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    });
    base.on("loading", () => { baseErrorCount = 0; });
    base.on("tileerror", () => { baseErrorCount++; setBaseFailed(true); });
    base.on("load", () => setBaseFailed(baseErrorCount > 0));
    base.addTo(instance);
    instance.on("click", (event: L.LeafletMouseEvent) => {
      const longitudeWrapped = ((event.latlng.lng + 180) % 360 + 360) % 360 - 180;
      if (Math.abs(event.latlng.lat) <= 90) onPickRef.current?.(event.latlng.lat, longitudeWrapped);
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    map.current?.setView([latitude, longitude], zoom, { animate: false });
  }, [latitude, longitude, zoom]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !radarUrl) return;
    let radarErrorCount = 0;
    const layer = L.tileLayer(radarUrl, {
      opacity: 0.65, maxNativeZoom: 7, maxZoom: 18,
      attribution: '<a href="https://www.rainviewer.com/" target="_blank" rel="noopener noreferrer">Weather data by RainViewer</a>',
    });
    layer.on("loading", () => { radarErrorCount = 0; });
    layer.on("tileerror", () => { radarErrorCount++; setRadarFailed(true); });
    layer.on("load", () => setRadarFailed(radarErrorCount > 0));
    layer.addTo(instance);
    return () => { layer.remove(); };
  }, [radarUrl]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !events) return;
    const group = L.layerGroup().addTo(instance);
    for (const event of events) {
      const container = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = event.title;
      container.appendChild(title);
      const position = document.createElement("p");
      position.textContent = `${event.latitude.toFixed(3)}, ${event.longitude.toFixed(3)}`;
      container.appendChild(position);
      if (event.url && /^https?:\/\//.test(event.url)) {
        const link = document.createElement("a");
        link.href = event.url;
        link.textContent = "Source ↗";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        container.appendChild(link);
      }
      L.circleMarker([event.latitude, event.longitude], {
        radius: 7, color: "#fff", weight: 2, fillColor: event.color ?? "#6963e8", fillOpacity: 0.9,
      }).bindPopup(container).addTo(group);
    }
    return () => { group.remove(); };
  }, [events]);

  useEffect(() => {
    const instance = map.current;
    if (!instance || events) return;
    const marker = L.circleMarker([latitude, longitude], {
      radius: 9, color: "#fff", weight: 3, fillColor: "#6963e8", fillOpacity: 1,
    }).addTo(instance);
    if (selectedValue) {
      const content = document.createElement("strong");
      content.textContent = selectedValue;
      marker.bindTooltip(content, { permanent: true, direction: "top", offset: [0, -12] }).openTooltip();
    }
    return () => { marker.remove(); };
  }, [latitude, longitude, selectedValue, events]);

  return <div className="weather-map-wrap" style={{ position: "relative", isolation: "isolate", minWidth: 0 }}>
    <div ref={element} role="region" aria-label={label} style={{ height: "clamp(350px, 60vh, 620px)", width: "100%", borderRadius: 24, background: "#e8edf3", zIndex: 0 }} />
    {(baseFailed || (radarUrl && radarFailed)) && <p role="status" className="source-note" style={{ margin: "8px 0 0" }}>{tileErrorLabel}</p>}
  </div>;
}

