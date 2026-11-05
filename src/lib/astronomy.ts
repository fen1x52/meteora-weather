import * as SunCalc from "suncalc";

/** Calendar day in the observer's zone; never the device's local date. */
export function localDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (key: string) => parts.find((part) => part.type === key)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function utcOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (key: string) => Number(parts.find((part) => part.type === key)?.value);
  return (Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

export function zonedNoon(dateKey: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Invalid calendar date");
  const nominal = new Date(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(nominal.getTime()) || nominal.toISOString().slice(0, 10) !== dateKey) throw new Error("Invalid calendar date");
  let result = nominal;
  for (let index = 0; index < 3; index++) {
    result = new Date(nominal.getTime() - utcOffsetMinutes(result, timeZone) * 60000);
  }
  return result;
}

export function calculateAstronomy(dateKey: string, latitude: number, longitude: number, timeZone: string) {
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error("Invalid coordinates");
  const noon = zonedNoon(dateKey, timeZone);
  const offset = utcOffsetMinutes(noon, timeZone);
  const sun = SunCalc.getTimes(noon, latitude, longitude, 0, offset);
  const moon = SunCalc.getMoonTimes(noon, latitude, longitude, offset);
  const illumination = SunCalc.getMoonIllumination(noon);
  const daylightSeconds = sun.alwaysUp ? 86400 : sun.alwaysDown ? 0 : sun.sunrise && sun.sunset
    ? Math.min(86400, Math.max(0, (sun.sunset.getTime() - sun.sunrise.getTime()) / 1000)) : null;
  return { sun, moon, illumination, daylightSeconds, nightSeconds: daylightSeconds === null ? null : 86400 - daylightSeconds, noon };
}

export function moonPhaseName(phase: number, language: "ru" | "en"): string {
  const names = language === "ru"
    ? ["Новолуние", "Растущий серп", "Первая четверть", "Растущая Луна", "Полнолуние", "Убывающая Луна", "Последняя четверть", "Убывающий серп"]
    : ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"];
  return names[Math.round(phase * 8) % 8] ?? names[0];
}

export function durationLabel(seconds: number | null, language: "ru" | "en"): string {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  const minutes = Math.round(seconds / 60);
  return language === "ru" ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

