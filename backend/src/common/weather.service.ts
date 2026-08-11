import { Injectable, Logger } from '@nestjs/common';

/**
 * WeatherService — fetches a forecast for the {{weather_forecast}} merge
 * field. Uses Open-Meteo (https://open-meteo.com) because it needs no API
 * key and no signup, so this Part works out of the box rather than
 * blocking on the spec's open question ("hansı hava API-sinə üstünlük
 * verirsən?"). Swapping to OpenWeatherMap/WeatherAPI/Visual Crossing later
 * is a one-file change — this is the only place that calls out.
 *
 * Per the spec's explicit resilience requirement: if the call fails (rate
 * limit, network issue, tenant has no lat/long configured), sending a
 * pre-arrival letter must never be blocked — callers get `null` back and
 * substitute a generic fallback string.
 */
@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async getForecastForDate(
    latitude: number,
    longitude: number,
    date: Date,
  ): Promise<{ summary: string; highC: number; lowC: number } | null> {
    try {
      const dateStr = date.toISOString().slice(0, 10);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto` +
        `&start_date=${dateStr}&end_date=${dateStr}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Open-Meteo returned ${res.status}`);
      const data = await res.json();

      const code = data?.daily?.weathercode?.[0];
      const highC = data?.daily?.temperature_2m_max?.[0];
      const lowC = data?.daily?.temperature_2m_min?.[0];
      if (code === undefined || highC === undefined || lowC === undefined) return null;

      return { summary: this.describeCode(code), highC, lowC };
    } catch (err: any) {
      this.logger.warn(`Weather fetch failed, falling back to generic text: ${err.message}`);
      return null;
    }
  }

  /** Human-readable text for {{weather_forecast}}, always safe to use even if the API call failed. */
  async getForecastText(latitude: number | null | undefined, longitude: number | null | undefined, date: Date): Promise<string> {
    if (latitude == null || longitude == null) {
      return 'Please check the local forecast closer to your arrival.';
    }
    const forecast = await this.getForecastForDate(latitude, longitude, date);
    if (!forecast) return 'Please check the local forecast closer to your arrival.';
    return `${forecast.summary}, with a high of ${Math.round(forecast.highC)}°C and a low of ${Math.round(forecast.lowC)}°C.`;
  }

  // WMO weather codes -> plain English (the subset Open-Meteo actually returns).
  private describeCode(code: number): string {
    const map: Record<number, string> = {
      0: 'Clear skies', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Foggy',
      51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
      80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
      95: 'Thunderstorms', 96: 'Thunderstorms with hail', 99: 'Thunderstorms with hail',
    };
    return map[code] || 'Mixed conditions';
  }
}
