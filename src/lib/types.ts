export type Language = "ru" | "en";
export type NullableNumber = number | null;
export interface Location {
  id: string;
  name: string;
  country: string;
  countryCode?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}
export interface Settings {
  language: Language;
  temperature: "celsius" | "fahrenheit";
  wind: "ms" | "kmh" | "mph";
  pressure: "hpa" | "mmhg";
  theme: "auto" | "light" | "dark" | "aurora" | "ocean" | "sunset";
  density: "comfortable" | "compact";
  animations: boolean;
  notifications: boolean;
}
export interface CurrentWeather {
  time: number;
  interval: number;
  temperature_2m: NullableNumber;
  relative_humidity_2m: NullableNumber;
  apparent_temperature: NullableNumber;
  is_day: NullableNumber;
  precipitation: NullableNumber;
  rain: NullableNumber;
  snowfall: NullableNumber;
  weather_code: NullableNumber;
  cloud_cover: NullableNumber;
  pressure_msl: NullableNumber;
  surface_pressure: NullableNumber;
  wind_speed_10m: NullableNumber;
  wind_direction_10m: NullableNumber;
  wind_gusts_10m: NullableNumber;
}
export interface HourlyWeather {
  time: number[];
  temperature_2m: NullableNumber[];
  apparent_temperature: NullableNumber[];
  relative_humidity_2m: NullableNumber[];
  precipitation_probability: NullableNumber[];
  precipitation: NullableNumber[];
  rain: NullableNumber[];
  snowfall: NullableNumber[];
  snow_depth: NullableNumber[];
  weather_code: NullableNumber[];
  cloud_cover: NullableNumber[];
  visibility: NullableNumber[];
  pressure_msl: NullableNumber[];
  wind_speed_10m: NullableNumber[];
  wind_direction_10m: NullableNumber[];
  wind_gusts_10m: NullableNumber[];
  uv_index: NullableNumber[];
  is_day: NullableNumber[];
}
export interface DailyWeather {
  time: number[];
  weather_code: NullableNumber[];
  temperature_2m_max: NullableNumber[];
  temperature_2m_min: NullableNumber[];
  apparent_temperature_max: NullableNumber[];
  apparent_temperature_min: NullableNumber[];
  sunrise: NullableNumber[];
  sunset: NullableNumber[];
  daylight_duration: NullableNumber[];
  sunshine_duration: NullableNumber[];
  uv_index_max: NullableNumber[];
  precipitation_sum: NullableNumber[];
  precipitation_probability_max: NullableNumber[];
  snowfall_sum: NullableNumber[];
  wind_speed_10m_max: NullableNumber[];
  wind_gusts_10m_max: NullableNumber[];
  wind_direction_10m_dominant: NullableNumber[];
}
export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  current: CurrentWeather;
  hourly: HourlyWeather;
  daily: DailyWeather;
  current_units: Record<string, string>;
  hourly_units: Record<string, string>;
  daily_units: Record<string, string>;
  fetchedAt: string;
}
export interface AirValues {
  european_aqi: NullableNumber;
  us_aqi: NullableNumber;
  pm2_5: NullableNumber;
  pm10: NullableNumber;
  carbon_monoxide: NullableNumber;
  nitrogen_dioxide: NullableNumber;
  sulphur_dioxide: NullableNumber;
  ozone: NullableNumber;
  dust: NullableNumber;
}
export interface AirQualityData {
  latitude: number;
  longitude: number;
  timezone: string;
  utc_offset_seconds: number;
  current: AirValues & { time: number; interval: number };
  hourly: { [K in keyof AirValues]: NullableNumber[] } & { time: number[] };
  current_units: Record<string, string>;
  hourly_units: Record<string, string>;
  fetchedAt: string;
}
export interface HistoryData {
  timezone: string;
  utc_offset_seconds: number;
  daily: Pick<DailyWeather, "time" | "temperature_2m_max" | "temperature_2m_min" | "precipitation_sum" | "snowfall_sum" | "wind_speed_10m_max" | "weather_code">;
  daily_units: Record<string, string>;
  fetchedAt: string;
}
export interface Earthquake {
  id: string;
  title: string;
  magnitude: NullableNumber;
  place: string;
  time: number;
  updated: number;
  latitude: number;
  longitude: number;
  depth: NullableNumber;
  url: string;
  tsunami: boolean;
}
export interface EarthquakeData { events: Earthquake[]; generatedAt: string; fetchedAt: string }
export interface NaturalEvent {
  id: string;
  title: string;
  categories: { id: string; title: string }[];
  date: string;
  latitude: number;
  longitude: number;
  sources: { id: string; url: string }[];
  url: string;
}
export interface NaturalEventData { events: NaturalEvent[]; fetchedAt: string }
export interface GeomagneticData {
  points: { time: number; kp: number }[];
  latest: { time: number; kp: number };
  fetchedAt: string;
}
export interface RadarData {
  host: string;
  generated: number;
  radar: { past: { time: number; path: string }[] };
  fetchedAt: string;
}
export interface OfficialAlert {
  id: string;
  event: string;
  headline: string;
  description: string;
  instruction: string;
  severity: string;
  effective: string;
  expires: string;
  url: string;
  senderName: string;
}
export interface OfficialAlertsData {
  supported: boolean;
  reason?: string;
  alerts: OfficialAlert[];
  fetchedAt: string;
  source: string;
}
export interface Insight {
  id: string;
  title: string;
  body: string;
  severity: "info" | "watch" | "warning";
}



