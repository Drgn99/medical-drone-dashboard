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

/**
 * Returns a lucide icon name based on WMO weather code.
 */
export function weatherCodeToIcon(
  code: number
): "Sun" | "CloudSun" | "Cloud" | "CloudFog" | "CloudRain" | "CloudLightning" {
  if (code === 0) return "Sun";
  if (code <= 2) return "CloudSun";
  if (code === 3) return "Cloud";
  if (code === 45 || code === 48) return "CloudFog";
  if (code >= 51 && code <= 82) return "CloudRain";
  if (code === 95) return "CloudLightning";
  return "Cloud";
}

export interface CurrentWeather {
  temperature: number;
  windSpeed: number;
  humidity: number;
  weatherCode: number;
}

export async function getCurrentWeather(
  lat: number,
  lng: number
): Promise<CurrentWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code,relative_humidity_2m&wind_speed_unit=ms&timezone=auto`;

    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const c = data?.current;
    if (!c) return null;

    return {
      temperature: c.temperature_2m,
      windSpeed: c.wind_speed_10m,
      humidity: c.relative_humidity_2m,
      weatherCode: c.weather_code,
    };
  } catch {
    return null;
  }
}
