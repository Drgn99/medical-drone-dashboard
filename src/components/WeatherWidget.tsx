import {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCurrentWeather,
  weatherCodeToLabel,
  weatherCodeToIcon,
  weatherIconColor,
} from "@/lib/weather";
import { LiveClock } from "@/components/LiveClock";

const ICONS = {
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudFog,
  CloudRain,
  CloudLightning,
} as const;

export async function WeatherWidget({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const weather = await getCurrentWeather(latitude, longitude);

  if (!weather) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">
            Weather data unavailable
          </p>
        </CardContent>
      </Card>
    );
  }

  const iconName = weatherCodeToIcon(weather.weatherCode, weather.isDay);
  const WeatherIcon = ICONS[iconName];
  const iconColor = weatherIconColor(iconName);
  const label = weatherCodeToLabel(weather.weatherCode);

  const windSafety =
    weather.windSpeed > 10
      ? { text: "NO-FLY: wind exceeds safe limit", color: "text-red-600" }
      : weather.windSpeed >= 6
        ? { text: "Caution: elevated wind", color: "text-amber-600" }
        : { text: "Safe for flight", color: "text-green-600" };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Current Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: weather data */}
          <div className="space-y-3">
            <div>
              <p className="text-3xl font-bold">{Math.round(weather.temperature)}°C</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>

            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Wind className="size-3.5" />
                {weather.windSpeed.toFixed(1)} m/s
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Droplets className="size-3.5" />
                {weather.humidity}%
              </span>
            </div>

            <div className={`text-xs font-medium ${windSafety.color}`}>
              {weather.windSpeed > 10
                ? "\u2717"
                : weather.windSpeed >= 6
                  ? "\u26A0"
                  : "\u2713"}{" "}
              {windSafety.text}
            </div>
          </div>

          {/* Right: icon + clock */}
          <div className="flex flex-col items-end gap-3">
            <WeatherIcon className={`size-10 ${iconColor}`} />
            <LiveClock />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
