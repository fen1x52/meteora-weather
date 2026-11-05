import type { Insight, Language, Settings, WeatherData } from "./types";

export type WeatherKind = "clear" | "cloud" | "rain" | "snow" | "storm" | "fog";
const labels: Record<number, [string, string]> = {
  0: ["Ясно", "Clear sky"], 1: ["Преимущественно ясно", "Mainly clear"],
  2: ["Переменная облачность", "Partly cloudy"], 3: ["Пасмурно", "Overcast"],
  45: ["Туман", "Fog"], 48: ["Изморозь и туман", "Depositing rime fog"],
  51: ["Лёгкая морось", "Light drizzle"], 53: ["Морось", "Moderate drizzle"], 55: ["Сильная морось", "Dense drizzle"],
  56: ["Переохлаждённая морось", "Freezing drizzle"], 57: ["Сильная переохлаждённая морось", "Dense freezing drizzle"],
  61: ["Небольшой дождь", "Light rain"], 63: ["Дождь", "Moderate rain"], 65: ["Сильный дождь", "Heavy rain"],
  66: ["Ледяной дождь", "Freezing rain"], 67: ["Сильный ледяной дождь", "Heavy freezing rain"],
  71: ["Небольшой снег", "Light snow"], 73: ["Снег", "Moderate snow"], 75: ["Сильный снег", "Heavy snow"],
  77: ["Снежные зёрна", "Snow grains"], 80: ["Небольшой ливень", "Light rain showers"],
  81: ["Ливень", "Moderate rain showers"], 82: ["Сильный ливень", "Violent rain showers"],
  85: ["Снежный ливень", "Snow showers"], 86: ["Сильный снежный ливень", "Heavy snow showers"],
  95: ["Гроза", "Thunderstorm"], 96: ["Гроза с градом", "Thunderstorm with hail"], 99: ["Сильная гроза с градом", "Thunderstorm with heavy hail"],
};
export function weatherLabel(code: number | null | undefined, language: Language = "ru"): string {
  return code !== null && code !== undefined && labels[code] ? labels[code][language === "ru" ? 0 : 1] : language === "ru" ? "Нет данных" : "Unavailable";
}
export function weatherKind(code: number | null | undefined): WeatherKind {
  if (code === null || code === undefined) return "cloud";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 51 && code <= 82) return "rain";
  if (code === 45 || code === 48) return "fog";
  return code <= 1 ? "clear" : "cloud";
}
function valid(value: number | null | undefined): value is number { return typeof value === "number" && Number.isFinite(value); }
export function temperatureValue(value: number | null | undefined, settings: Pick<Settings, "temperature">): number | null {
  return valid(value) ? settings.temperature === "fahrenheit" ? value * 9 / 5 + 32 : value : null;
}
export function formatTemp(value: number | null | undefined, settings: Pick<Settings, "temperature">): string {
  const converted = temperatureValue(value, settings);
  return converted === null ? "—" : `${Math.round(converted)}°`;
}
export function formatWind(value: number | null | undefined, settings: Pick<Settings, "wind" | "language">): string {
  if (!valid(value)) return "—";
  const converted = settings.wind === "kmh" ? value * 3.6 : settings.wind === "mph" ? value * 2.2369362921 : value;
  const units = settings.language === "ru" ? { ms: "м/с", kmh: "км/ч", mph: "миль/ч" } : { ms: "m/s", kmh: "km/h", mph: "mph" };
  return `${new Intl.NumberFormat(settings.language, { maximumFractionDigits: 1 }).format(converted)} ${units[settings.wind]}`;
}
export function formatPressure(value: number | null | undefined, settings: Pick<Settings, "pressure" | "language">): string {
  if (!valid(value)) return "—";
  const converted = settings.pressure === "mmhg" ? value * 0.750061683 : value;
  return `${Math.round(converted)} ${settings.pressure === "mmhg" ? settings.language === "ru" ? "мм рт. ст." : "mmHg" : settings.language === "ru" ? "гПа" : "hPa"}`;
}
function dateFormat(epoch: number | null | undefined, timezone: string, language: Language, options: Intl.DateTimeFormatOptions): string {
  if (!valid(epoch)) return "—";
  const date = new Date(epoch * 1000);
  if (!Number.isFinite(date.getTime())) return "—";
  try { return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-GB", { ...options, timeZone: timezone }).format(date); }
  catch { return new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-GB", { ...options, timeZone: "UTC" }).format(date); }
}
export function formatTime(epoch: number | null | undefined, timezone: string, language: Language = "ru"): string {
  return dateFormat(epoch, timezone, language, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}
export function formatDate(epoch: number | null | undefined, timezone: string, language: Language = "ru"): string {
  return dateFormat(epoch, timezone, language, { day: "numeric", month: "short", weekday: "short" });
}
export function windDirection(degrees: number | null | undefined, language: Language = "ru"): string {
  if (!valid(degrees)) return "—";
  const compass = language === "ru" ? ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"] : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return compass[Math.round(((degrees % 360 + 360) % 360) / 45) % 8];
}
export function currentHourIndex(weather: WeatherData): number {
  const index = weather.hourly.time.findIndex(time => time >= weather.current.time);
  return index < 0 ? Math.max(0, weather.hourly.time.length - 1) : index;
}
export function buildInsights(weather: WeatherData, language: Language = "ru"): Insight[] {
  const ru = language === "ru", result: Insight[] = [], { current, hourly, daily } = weather;
  const start = currentHourIndex(weather), next12 = hourly.precipitation_probability.slice(start, start + 12).filter(valid);
  const rainChance = next12.length ? Math.max(...next12) : null;
  if (rainChance !== null && rainChance >= 50) {
    const index = hourly.precipitation_probability.findIndex((value, i) => i >= start && i < start + 12 && valid(value) && value >= 50);
    result.push({ id: "precipitation", title: ru ? "Захватите зонт" : "Take an umbrella", body: ru ? `В ближайшие 12 часов вероятность осадков до ${Math.round(rainChance)}%. Возможное начало: ${formatTime(hourly.time[index], weather.timezone, language)}.` : `Precipitation probability reaches ${Math.round(rainChance)}% in the next 12 hours. Possible onset: ${formatTime(hourly.time[index], weather.timezone, language)}.`, severity: "watch" });
  }
  const today = daily.temperature_2m_max[0], tomorrow = daily.temperature_2m_max[1];
  if (valid(today) && valid(tomorrow) && Math.abs(tomorrow - today) >= 5) {
    const warming = tomorrow > today;
    result.push({ id: "temperature-change", title: ru ? warming ? "Завтра заметно теплее" : "Завтра похолодает" : warming ? "Warmer tomorrow" : "Cooler tomorrow", body: ru ? `Дневной максимум изменится примерно на ${Math.round(Math.abs(tomorrow - today))} °C по сравнению с сегодняшним.` : `Tomorrow's high is about ${Math.round(Math.abs(tomorrow - today))} °C ${warming ? "higher" : "lower"} than today's.`, severity: "watch" });
  }
  const gusts = hourly.wind_gusts_10m.slice(start, start + 12).filter(valid);
  if (gusts.length && Math.max(...gusts) >= 14) result.push({ id: "wind", title: ru ? "Сильные порывы ветра" : "Strong wind gusts", body: ru ? "В ближайшие 12 часов модель ожидает порывы от 14 м/с. Будьте осторожны рядом с деревьями и лёгкими конструкциями." : "The model forecasts gusts of 14 m/s or more within 12 hours. Take care near trees and lightweight structures.", severity: "warning" });
  if (valid(daily.uv_index_max[0]) && daily.uv_index_max[0] >= 6) result.push({ id: "uv", title: ru ? "Высокий УФ-индекс" : "High UV index", body: ru ? "В полуденные часы выбирайте тень, закрытую одежду и защиту от солнца." : "Seek shade, cover exposed skin and use sun protection around midday.", severity: "watch" });
  const codes = hourly.weather_code.slice(start, start + 12);
  if (codes.some(code => valid(code) && code >= 95)) result.push({ id: "storm", title: ru ? "Возможна гроза" : "Thunderstorms possible", body: ru ? "Модель показывает грозовые условия в ближайшие 12 часов. Следите за сообщениями местной метеослужбы." : "The model indicates thunderstorm conditions within 12 hours. Check updates from your local weather service.", severity: "warning" });
  const feels = current.apparent_temperature;
  if (valid(feels)) result.push({ id: "clothing", title: ru ? "Что надеть" : "What to wear", body: feels < 0 ? ru ? "Утеплённая куртка, шапка и перчатки. На влажных поверхностях возможна скользкость." : "Wear a warm coat, hat and gloves. Wet surfaces may be slippery." : feels < 12 ? ru ? "Тёплая куртка и несколько слоёв одежды помогут сохранить комфорт на улице." : "A warm jacket and layers will keep you comfortable outdoors." : feels < 20 ? ru ? "Лёгкая куртка или кардиган пригодятся для прогулки." : "A light jacket or cardigan will be useful outside." : ru ? "Лёгкая дышащая одежда; возьмите воду на прогулку." : "Wear light, breathable clothing and carry water.", severity: "info" });
  if (!result.length) result.push({ id: "limited", title: ru ? "Недостаточно данных для обзора" : "Limited data for a summary", body: ru ? "Доступные значения показаны в прогнозе. Обзор появится после обновления источника." : "Available values are shown in the forecast. The summary will return when the source updates.", severity: "info" });
  return result;
}

