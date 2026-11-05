import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, clearApiCache, fetchLocations, fetchOfficialAlerts, fetchWeather, parseWeather, validateHistoryRange, validateLocation } from "./api";
import type { Location } from "./types";

const location: Location = { id: "test", name: "Test", country: "Russia", countryCode: "RU", latitude: 55.75, longitude: 37.62 };
const rawWeather = () => ({ latitude: 55.75, longitude: 37.62, timezone: "Europe/Moscow", utc_offset_seconds: 10800, current: { time: 1735689600, temperature_2m: 2 }, hourly: { time: [1735689600, 1735693200], temperature_2m: [2, null] }, daily: { time: [1735689600], temperature_2m_max: [5] }, current_units: { temperature_2m: "°C", wind_speed_10m: "m/s" } });
afterEach(() => { vi.unstubAllGlobals(); clearApiCache(); });
describe("API response validation", () => {
  it("rejects malformed envelopes and nonmonotonic times", () => {
    expect(() => parseWeather({}, "2025-01-01T00:00:00Z")).toThrow(ApiError);
    const raw = rawWeather(); raw.hourly.time = [2, 1];
    expect(() => parseWeather(raw, "2025-01-01T00:00:00Z")).toThrow(/time series/);
  });
  it("preserves missing and malformed metrics as null without changing timeline alignment", () => {
    const data = parseWeather(rawWeather(), "2025-01-01T00:00:00Z");
    expect(data.hourly.temperature_2m).toEqual([2, null]);
    expect(data.hourly.snow_depth).toEqual([null, null]);
    expect(data.current.wind_speed_10m).toBeNull();
    expect(data.fetchedAt).toBe("2025-01-01T00:00:00Z");
  });
  it("rejects unexpected units instead of silently displaying wrong values", () => {
    const raw = rawWeather(); raw.current_units.temperature_2m = "°F";
    expect(() => parseWeather(raw, "2025-01-01T00:00:00Z")).toThrow(/temperature unit/);
  });
  it("rejects invalid coordinates before issuing requests", () => {
    expect(() => validateLocation({ latitude: 91, longitude: 0 })).toThrow(ApiError);
    expect(() => validateLocation({ latitude: Number.NaN, longitude: 0 })).toThrow(ApiError);
    expect(() => validateLocation({ latitude: 90, longitude: -180 })).not.toThrow();
  });
});
describe("history date validation", () => {
  const now = Date.parse("2026-11-05T12:00:00Z");
  it("checks real calendar dates and ordering", () => {
    expect(() => validateHistoryRange("2026-02-30", "2026-03-02", now)).toThrow();
    expect(() => validateHistoryRange("2026-10-30", "2026-10-29", now)).toThrow();
    expect(() => validateHistoryRange("2026-10-01", "2026-10-30", now)).not.toThrow();
  });
  it("enforces archive delay and bounded ranges", () => {
    expect(() => validateHistoryRange("2026-11-01", "2026-11-02", now)).toThrow(/5-day/);
    expect(() => validateHistoryRange("2026-01-01", "2026-10-01", now)).toThrow(/93 days/);
  });
});
describe("request behavior", () => {
  it("deduplicates concurrent requests, caches successful responses and preserves fetch time", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(rawWeather()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const [first, second] = await Promise.all([fetchWeather(location), fetchWeather(location)]);
    const third = await fetchWeather(location);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.fetchedAt).toBe(second.fetchedAt); expect(first.fetchedAt).toBe(third.fetchedAt);
    expect(String(fetchMock.mock.calls[0])).toContain("forecast_days=14");
  });
  it("never reports out-of-coverage regions as having no official alerts", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const result = await fetchOfficialAlerts(location);
    expect(result.supported).toBe(false); expect(result.reason).toContain("United States"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns no results for short search without making a request", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await fetchLocations("a")).toEqual([]); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("handles empty geocoding results and refuses malformed coordinates", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ results: [{ id: 1, name: "Broken", latitude: 999, longitude: 0 }] }), { status: 200 })));
    expect(await fetchLocations("Broken")).toEqual([]);
  });
  it("exposes API failure instead of generating substitute values", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 403 })); vi.stubGlobal("fetch", fetchMock);
    await expect(fetchWeather(location)).rejects.toThrow(/HTTP 403/); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

