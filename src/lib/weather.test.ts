import { describe, expect, it } from "vitest";
import { parseWeather } from "./api";
import { buildInsights, formatDate, formatPressure, formatTemp, formatTime, formatWind, weatherKind, weatherLabel, windDirection } from "./weather";
import type { Settings } from "./types";

const settings: Settings = { language: "en", temperature: "celsius", wind: "ms", pressure: "hpa", theme: "auto", density: "comfortable", animations: true, notifications: false };
function forecast() {
  return parseWeather({ latitude: 55.75, longitude: 37.62, timezone: "Europe/Moscow", utc_offset_seconds: 10800,
    current: { time: 1735689600, interval: 900, apparent_temperature: 5, temperature_2m: 6 },
    hourly: { time: [1735689600, 1735693200, 1735696800], precipitation_probability: [10, 80, 60], wind_gusts_10m: [2, 4, 5], weather_code: [0, 61, 61] },
    daily: { time: [1735689600, 1735776000], temperature_2m_max: [8, 1], uv_index_max: [2, 2] },
  }, "2025-01-01T00:00:00Z");
}
describe("unit conversion and unavailable data", () => {
  it("converts temperature without treating null as freezing", () => {
    expect(formatTemp(0, settings)).toBe("0°");
    expect(formatTemp(-40, { temperature: "fahrenheit" })).toBe("-40°");
    expect(formatTemp(20, { temperature: "fahrenheit" })).toBe("68°");
    expect(formatTemp(null, settings)).toBe("—");
    expect(formatTemp(Number.NaN, settings)).toBe("—");
  });
  it("converts canonical m/s into requested wind units", () => {
    expect(formatWind(10, { ...settings, wind: "kmh" })).toBe("36 km/h");
    expect(formatWind(10, { ...settings, wind: "mph" })).toBe("22.4 mph");
    expect(formatWind(0, settings)).toBe("0 m/s");
    expect(formatWind(null, settings)).toBe("—");
  });
  it("converts hPa pressure to mmHg", () => {
    expect(formatPressure(1013.25, { ...settings, pressure: "mmhg" })).toBe("760 mmHg");
    expect(formatPressure(undefined, settings)).toBe("—");
  });
});
describe("location time zones", () => {
  it("formats an absolute epoch in the selected location, not browser time", () => {
    const epoch = Date.parse("2025-01-01T23:30:00Z") / 1000;
    expect(formatTime(epoch, "Europe/Moscow", "en")).toBe("02:30");
    expect(formatTime(epoch, "America/New_York", "en")).toBe("18:30");
    expect(formatDate(epoch, "Europe/Moscow", "en")).toContain("2 Jan");
    expect(formatDate(epoch, "America/New_York", "en")).toContain("1 Jan");
  });
  it("handles DST at the location and null polar solar events", () => {
    const before = Date.parse("2025-03-30T00:30:00Z") / 1000;
    const after = Date.parse("2025-03-30T01:30:00Z") / 1000;
    expect(formatTime(before, "Europe/Berlin", "en")).toBe("01:30");
    expect(formatTime(after, "Europe/Berlin", "en")).toBe("03:30");
    expect(formatTime(null, "Arctic/Longyearbyen")).toBe("—");
  });
});
describe("data-based insights", () => {
  it("generates rain and temperature-change advice from real fields", () => {
    const insights = buildInsights(forecast(), "en");
    expect(insights.find(value => value.id === "precipitation")?.body).toContain("80%");
    expect(insights.find(value => value.id === "temperature-change")?.title).toBe("Cooler tomorrow");
    expect(insights.some(value => value.id === "storm")).toBe(false);
  });
  it("does not turn missing data into reassuring claims", () => {
    const data = forecast();
    data.hourly.precipitation_probability = [null, null, null];
    data.daily.temperature_2m_max = [null, null];
    data.current.apparent_temperature = null;
    expect(buildInsights(data, "en").map(v => v.id)).toEqual(["limited"]);
  });
  it("ignores old rain probabilities outside the upcoming period", () => {
    const data = forecast();
    data.current.time = data.hourly.time[2];
    data.hourly.precipitation_probability = [100, 100, 0];
    expect(buildInsights(data).some(v => v.id === "precipitation")).toBe(false);
  });
  it("only flags storm conditions when a storm code is present", () => {
    const data = forecast(); data.hourly.weather_code[2] = 95;
    expect(buildInsights(data).find(v => v.id === "storm")?.severity).toBe("warning");
  });
});
describe("weather symbols and wind direction", () => {
  it("keeps snow showers separate from rain", () => {
    expect(weatherKind(85)).toBe("snow"); expect(weatherKind(61)).toBe("rain"); expect(weatherKind(45)).toBe("fog");
    expect(weatherLabel(null, "en")).toBe("Unavailable");
  });
  it("wraps compass bearings correctly", () => {
    expect(windDirection(360, "en")).toBe("N"); expect(windDirection(-90, "en")).toBe("W"); expect(windDirection(null)).toBe("—");
  });
});


