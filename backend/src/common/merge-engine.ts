/**
 * Simple, dependency-free {{merge_field}} renderer for Part 5 (Pre-Arrival
 * Letters). Deliberately not a full templating language (no conditionals
 * / loops) — the spec's supported field list is flat, so a single
 * global-replace pass is all that's needed and stays easy to audit.
 */
export function renderMergeFields(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

export const SUPPORTED_MERGE_FIELDS = [
  { key: 'guest_first_name', label: 'Guest First Name' },
  { key: 'guest_full_name', label: 'Guest Full Name' },
  { key: 'room_type', label: 'Room Type' },
  { key: 'room_inclusions', label: 'Room Inclusions' },
  { key: 'arrival_date', label: 'Arrival Date' },
  { key: 'departure_date', label: 'Departure Date' },
  { key: 'hotel_name', label: 'Hotel Name' },
  { key: 'hotel_general_info', label: 'Hotel General Info' },
  { key: 'weather_forecast', label: 'Weather Forecast' },
  { key: 'event_list', label: 'Event List' },
] as const;
