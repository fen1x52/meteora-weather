import { describe, expect, it } from "vitest";
import { calculateAstronomy, durationLabel, localDateKey, moonPhaseName, utcOffsetMinutes, zonedNoon } from "./astronomy";

describe("observer-local astronomical calculations", () => {
  it("keeps the calendar day independent of the viewer's timezone", () => {
    expect(localDateKey(new Date("2026-11-05T23:00:00Z"), "Asia/Tokyo")).toBe("2026-11-06");
    expect(localDateKey(new Date("2026-11-05T01:00:00Z"), "America/New_York")).toBe("2026-11-04");
    expect(zonedNoon("2026-11-05", "Asia/Kolkata").toISOString()).toBe("2026-11-05T06:30:00.000Z");
  });
  it("uses date-specific daylight saving offsets", () => {
    expect(utcOffsetMinutes(new Date("2026-07-01T12:00:00Z"), "America/New_York")).toBe(-240);
    expect(utcOffsetMinutes(new Date("2026-12-01T12:00:00Z"), "America/New_York")).toBe(-300);
  });
  it("returns sunrise and sunset on the chosen far-east calendar day", () => {
    const data = calculateAstronomy("2026-06-21", 35.68, 139.76, "Asia/Tokyo");
    expect(localDateKey(data.sun.sunrise!, "Asia/Tokyo")).toBe("2026-06-21");
    expect(localDateKey(data.sun.sunset!, "Asia/Tokyo")).toBe("2026-06-21");
    expect(data.daylightSeconds).toBeGreaterThan(14 * 3600);
    expect(data.illumination.fraction).toBeGreaterThanOrEqual(0);
    expect(data.illumination.fraction).toBeLessThanOrEqual(1);
  });
  it("handles polar day and polar night without invalid durations", () => {
    expect(calculateAstronomy("2026-06-21", 78.22, 15.65, "Arctic/Longyearbyen").daylightSeconds).toBe(86400);
    expect(calculateAstronomy("2026-12-21", 78.22, 15.65, "Arctic/Longyearbyen").daylightSeconds).toBe(0);
  });
  it("rejects invalid dates and coordinates", () => {
    expect(() => zonedNoon("2026-02-30", "UTC")).toThrow();
    expect(() => calculateAstronomy("2026-11-05", 100, 0, "UTC")).toThrow();
  });
  it("formats lunar cycle and durations at boundaries", () => {
    expect(moonPhaseName(0.99, "en")).toBe("New moon");
    expect(moonPhaseName(0.5, "ru")).toBe("Полнолуние");
    expect(durationLabel(null, "ru")).toBe("—");
    expect(durationLabel(3650, "en")).toBe("1 h 1 min");
  });
});

