const WMO_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

export function weatherCodeToLabel(code: number): string {
  return WMO_LABELS[code] ?? "Unknown";
}

export type WeatherIconName =
  | "Sun"
  | "Moon"
  | "CloudSun"
  | "CloudMoon"
  | "Cloud"
  | "CloudFog"
  | "CloudRain"
  | "CloudLightning";

/**
 * Returns a lucide icon name based on WMO weather code and day/night.
 */
export function weatherCodeToIcon(
  code: number,
  isDay: boolean
): WeatherIconName {
  if (code === 0) return isDay ? "Sun" : "Moon";
  if (code <= 2) return isDay ? "CloudSun" : "CloudMoon";
  if (code === 3) return "Cloud";
  if (code === 45 || code === 48) return "CloudFog";
  if (code >= 51 && code <= 82) return "CloudRain";
  if (code === 95) return "CloudLightning";
  return "Cloud";
}

/**
 * Returns a Tailwind color class for the weather icon.
 */
export function weatherIconColor(icon: WeatherIconName): string {
  switch (icon) {
    case "Sun":
      return "text-amber-500";
    case "Moon":
      return "text-slate-400";
    case "CloudSun":
      return "text-amber-400";
    case "CloudMoon":
      return "text-slate-400";
    case "CloudRain":
      return "text-blue-400";
    case "CloudLightning":
      return "text-purple-500";
    case "CloudFog":
      return "text-slate-400";
    case "Cloud":
      return "text-slate-500";
  }
}

// ── Weather code validation ─────────────────────────────────────────────────

function validateWeatherCode(
  code: number,
  tempC: number,
  humidity: number
): { code: number; overrideReason: string | null } {
  // Thunderstorm (95) or with hail (96, 99) requires humid, unstable
  // conditions. High temp + low humidity → almost certainly not real.
  if ([95, 96, 99].includes(code) && tempC > 30 && humidity < 70) {
    return {
      code: 1,
      overrideReason:
        "Thunderstorm reported but humidity too low to be plausible",
    };
  }

  // Heavy rain (65) and heavy showers (82) also need humid air.
  if ([65, 82].includes(code) && tempC > 35 && humidity < 50) {
    return {
      code: 1,
      overrideReason:
        "Heavy precipitation reported but conditions inconsistent",
    };
  }

  // Snow codes (71-77, 85-86) make no sense above 5°C.
  if (code >= 71 && code <= 86 && tempC > 5) {
    return {
      code: 1,
      overrideReason: "Snow reported but temperature too high",
    };
  }

  return { code, overrideReason: null };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
  rawWeatherCode: number;
  overrideReason: string | null;
  isDay: boolean;
}

export async function getCurrentWeather(
  lat: number,
  lng: number
): Promise<CurrentWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m,is_day&wind_speed_unit=ms&timezone=auto`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const c = data?.current;
    if (!c) return null;

    const apiCode = c.weather_code as number;
    const validation = validateWeatherCode(
      apiCode,
      c.temperature_2m,
      c.relative_humidity_2m
    );

    return {
      temperature: c.temperature_2m,
      windSpeed: c.wind_speed_10m,
      humidity: c.relative_humidity_2m,
      weatherCode: validation.code,
      rawWeatherCode: apiCode,
      overrideReason: validation.overrideReason,
      isDay: c.is_day === 1,
    };
  } catch {
    return null;
  }
}
