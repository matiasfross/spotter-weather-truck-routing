import type { RouteCalculateResponse, PlaceSuggestion, PresetRoute } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface CalculateParams {
  origin: string;
  destination: string;
  departure_time?: string;
  load_weight_lbs: number;
  sampling_miles: 10 | 25 | 50;
}

export async function calculateRoutes(params: CalculateParams): Promise<RouteCalculateResponse> {
  const response = await fetch(`${API_BASE_URL}/routes/calculate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to calculate routes';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.details || errorMsg;
      if (typeof errorMsg === 'object') {
        errorMsg = Object.entries(errorMsg)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const resp = await fetch(`${API_BASE_URL}/routes/geocode/?q=${encodeURIComponent(query)}`);
    if (resp.ok) {
      const data = await resp.json();
      return data.results || [];
    }
  } catch {
    // ignore autocomplete failures
  }
  return [];
}

export async function fetchPresets(): Promise<PresetRoute[]> {
  try {
    const resp = await fetch(`${API_BASE_URL}/routes/presets/`);
    if (resp.ok) {
      const data = await resp.json();
      return data.presets || [];
    }
  } catch {
    // ignore
  }
  return [];
}
