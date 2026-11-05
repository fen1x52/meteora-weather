'use client';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, LoaderCircle, RefreshCw, Sun, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { useMeteora } from './providers';
export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section>; }
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p className="muted">{description}</p>}</div>{action}</div>;
}
export function Metric({ label, value, detail, icon }: { label: string; value: React.ReactNode; detail?: React.ReactNode; icon?: React.ReactNode }) { return <div className="metric"><div className="metric-label">{icon}<span>{label}</span></div><div className="metric-value">{value}</div>{detail && <div className="metric-detail">{detail}</div>}</div>; }
export function State({ loading, error, empty, retry }: { loading?: boolean; error?: string; empty?: string; retry?: () => void }) {
  const { t } = useMeteora();
  if (loading) return <div className="state" role="status"><LoaderCircle className="spin" size={28}/><span>{t('Загружаем данные источника…', 'Loading source data…')}</span><div className="skeleton"/></div>;
  if (error) return <div className="state state-error" role="alert"><TriangleAlert size={26}/><strong>{t('Не удалось получить данные', 'Could not load data')}</strong><p>{error}</p>{retry && <button className="button secondary" onClick={retry}><RefreshCw size={16}/>{t('Повторить', 'Try again')}</button>}</div>;
  if (empty) return <div className="state"><Cloud size={28}/><p>{empty}</p></div>;
  return null;
}
export function SourceNote({ children }: { children: React.ReactNode }) { return <div className="source-note">{children}</div>; }
export function WeatherIcon({ code, size = 26 }: { code: number | null | undefined; size?: number }) {
  const Icon = code === 0 ? Sun : code === 1 || code === 2 ? CloudSun : code === 3 ? Cloud : code === 45 || code === 48 ? CloudFog : code != null && code >= 95 ? CloudLightning : code != null && ((code >= 71 && code <= 77) || code === 85 || code === 86) ? CloudSnow : code != null && code >= 61 ? CloudRain : code != null && code >= 51 ? CloudDrizzle : Cloud;
  return <Icon size={size} strokeWidth={1.7} className={`weather-icon ${code === 0 ? 'sun-icon' : ''}`} aria-hidden="true"/>;
}
export function Sparkline({ values, color = 'var(--accent)', height = 100 }: { values: (number | null)[]; color?: string; height?: number }) {
  const id = useId().replace(/:/g, ''); const real = values.filter((x): x is number => x !== null && Number.isFinite(x));
  if (!real.length) return <div className="muted">—</div>;
  const min = Math.min(...real) - 2, range = Math.max(...real) - min + 2;
  const points = values.map((v, i) => v === null ? null : `${(i / Math.max(1, values.length - 1)) * 600},${height - 12 - ((v - min) / range) * (height - 24)}`);
  const paths: string[] = []; let segment: string[] = [];
  for (const p of points) { if (p === null) { if (segment.length) paths.push('M' + segment.join(' L')); segment = []; } else segment.push(p); } if (segment.length) paths.push('M' + segment.join(' L'));
  return <svg viewBox={`0 0 600 ${height}`} className="sparkline" aria-hidden="true" preserveAspectRatio="none"><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{paths.map((d, i) => <path key={i} d={d} stroke={color} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}</svg>;
}

