export type CurrentWeather = {
  apparentTemperature: number;
  description: string;
  icon: "cloud" | "partly-sunny" | "rainy" | "snow" | "sunny" | "thunderstorm";
  latitude: number;
  locationName: string;
  longitude: number;
  temperature: number;
  updatedAt: string;
  windSpeed: number;
};

type WeatherResponse = {
  current?: {
    apparent_temperature?: number;
    is_day?: number;
    temperature_2m?: number;
    time?: string;
    weather_code?: number;
    wind_speed_10m?: number;
  };
};

export type WeatherDetails = {
  apparentTemperature: number;
  currentTemperature: number;
  daily: { code: number; date: string; max: number; min: number }[];
  hourly: { code: number; temperature: number; time: string; windSpeed: number }[];
  humidity: number;
  pressure: number;
  sunset: string;
  uvIndex: number;
  windDirection: number;
  windSpeed: number;
};

export function describeWeather(code: number, isDay = true) {
  if (code === 0) {
    return { description: isDay ? "Trời quang" : "Trời quang về đêm", icon: isDay ? "sunny" : "cloud" } as const;
  }
  if (code <= 3) return { description: "Có mây", icon: "partly-sunny" } as const;
  if (code === 45 || code === 48) return { description: "Có sương mù", icon: "cloud" } as const;
  if (code >= 71 && code <= 77) return { description: "Có tuyết", icon: "snow" } as const;
  if (code >= 95) return { description: "Có dông", icon: "thunderstorm" } as const;
  return { description: "Có mưa", icon: "rainy" } as const;
}

export async function fetchWeather({
  latitude,
  locationName,
  longitude,
  signal,
}: {
  latitude: number;
  locationName: string;
  longitude: number;
  signal?: AbortSignal;
}): Promise<CurrentWeather> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid coordinates");
  }

  const roundedLatitude = latitude.toFixed(2);
  const roundedLongitude = longitude.toFixed(2);
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${roundedLatitude}` +
    `&longitude=${roundedLongitude}` +
    "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
    "&timezone=auto";
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Weather request failed");

  const payload = (await response.json()) as WeatherResponse;
  const current = payload.current;
  if (
    !current ||
    typeof current.temperature_2m !== "number" ||
    typeof current.apparent_temperature !== "number" ||
    typeof current.weather_code !== "number" ||
    typeof current.wind_speed_10m !== "number" ||
    typeof current.time !== "string"
  ) {
    throw new Error("Invalid weather response");
  }

  const condition = describeWeather(current.weather_code, current.is_day === 1);
  return {
    apparentTemperature: current.apparent_temperature,
    description: condition.description,
    icon: condition.icon,
    latitude: Number(roundedLatitude),
    locationName,
    longitude: Number(roundedLongitude),
    temperature: current.temperature_2m,
    updatedAt: current.time,
    windSpeed: current.wind_speed_10m,
  };
}

export async function fetchWeatherDetails(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<WeatherDetails> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}` +
    `&longitude=${longitude.toFixed(2)}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure" +
    "&hourly=temperature_2m,weather_code,wind_speed_10m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunset" +
    "&timezone=auto&forecast_days=5";
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Weather details request failed");
  const payload = (await response.json()) as {
    current?: Record<string, number | string>;
    daily?: Record<string, (number | string)[]>;
    hourly?: Record<string, (number | string)[]>;
  };
  const current = payload.current;
  const daily = payload.daily;
  const hourly = payload.hourly;
  if (!current || !daily || !hourly) throw new Error("Invalid forecast response");

  const dailyTimes = daily.time as string[] | undefined;
  const hourlyTimes = hourly.time as string[] | undefined;
  if (!dailyTimes?.length || !hourlyTimes?.length) throw new Error("Missing forecast times");
  const currentTime = String(current.time ?? "");
  const startIndex = Math.max(0, hourlyTimes.findIndex((time) => time >= currentTime));

  const details: WeatherDetails = {
    apparentTemperature: Number(current.apparent_temperature),
    currentTemperature: Number(current.temperature_2m),
    daily: dailyTimes.map((date, index) => ({
      code: Number(daily.weather_code?.[index]),
      date,
      max: Number(daily.temperature_2m_max?.[index]),
      min: Number(daily.temperature_2m_min?.[index]),
    })),
    hourly: hourlyTimes.slice(startIndex, startIndex + 12).map((time, offset) => {
      const index = startIndex + offset;
      return {
        code: Number(hourly.weather_code?.[index]),
        temperature: Number(hourly.temperature_2m?.[index]),
        time,
        windSpeed: Number(hourly.wind_speed_10m?.[index]),
      };
    }),
    humidity: Number(current.relative_humidity_2m),
    pressure: Number(current.surface_pressure),
    sunset: String(daily.sunset?.[0] ?? ""),
    uvIndex: Number(daily.uv_index_max?.[0]),
    windDirection: Number(current.wind_direction_10m),
    windSpeed: Number(current.wind_speed_10m),
  };
  const numericValues = [
    details.apparentTemperature,
    details.currentTemperature,
    details.humidity,
    details.pressure,
    details.uvIndex,
    details.windDirection,
    details.windSpeed,
    ...details.daily.flatMap((day) => [day.code, day.max, day.min]),
    ...details.hourly.flatMap((hour) => [hour.code, hour.temperature, hour.windSpeed]),
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) {
    throw new Error("Invalid forecast values");
  }
  return details;
}
