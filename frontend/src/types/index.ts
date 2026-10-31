export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'NO_TRAVEL';

export interface WeatherPoint {
  wind_speed_mph: number;
  wind_gusts_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
  temperature_f: number;
  weather_code: number;
  description: string;
  icon: string;
  is_simulated?: boolean;
}

export interface ConditionRisk {
  value_mph?: number;
  value_in_hr?: number;
  risk: RiskLevel;
  risk_label: string;
  reasons: string[];
}

export interface RiskEvaluation {
  overall_risk: RiskLevel;
  overall_risk_label: string;
  overall_risk_score: number;
  color: string;
  is_no_travel: boolean;
  wind: ConditionRisk;
  rain: ConditionRisk;
  snow: ConditionRisk;
  load_weight_lbs: number;
  load_rule_applied: boolean;
  hazard_reasons: string[];
}

export interface Checkpoint {
  index: number;
  lat: number;
  lon: number;
  distance_from_origin_miles: number;
  segment_miles: number;
  cumulative_duration_seconds: number;
  eta_iso: string;
  eta_formatted: string;
  weather: WeatherPoint;
  risk: RiskEvaluation;
}

export interface RouteRiskSummary {
  no_travel_miles: number;
  severe_miles: number;
  severe_and_worse_miles: number;
  high_miles: number;
  moderate_miles: number;
  low_miles: number;
  average_risk_score: number;
  average_risk_label: string;
  average_risk_color: string;
  has_no_travel: boolean;
  load_rule_trigger_count: number;
  max_wind_mph: number;
  max_rain_in_hr: number;
  max_snow_in_hr: number;
}

export interface RouteOption {
  id: string;
  route_number: number;
  name: string;
  title: string;
  routing_engine?: string;
  distance_miles: number;
  duration_seconds: number;
  duration_formatted: string;
  step_miles: number;
  polyline: [number, number][]; // [lon, lat]
  checkpoints: Checkpoint[];
  risk_summary: RouteRiskSummary;
  rank: number;
  is_recommended: boolean;
}

export interface CorridorTimelinePoint {
  hour_offset: number;
  time_iso: string;
  time_formatted: string;
  wind_mph: number;
  rain_in_hr: number;
  snow_in_hr: number;
  temp_f: number;
  risk_score: number;
  risk_level: RiskLevel;
  color: string;
  intensity: number;
}

export interface CorridorPoint {
  id: number;
  lat: number;
  lon: number;
  timeline: CorridorTimelinePoint[];
}

export interface RouteCalculateResponse {
  origin: { name: string; lat: number; lon: number };
  destination: { name: string; lat: number; lon: number };
  departure_time: string;
  departure_time_formatted: string;
  load_weight_lbs: number;
  sampling_miles: number;
  recommended_route_id: string;
  recommended_route_name: string;
  recommendation_summary: string;
  routes: RouteOption[];
  corridor_forecast_48h: CorridorPoint[];
  risk_rules_reference?: Record<string, string>;
}

export interface PresetRoute {
  id: string;
  title: string;
  subtitle: string;
  origin: string;
  destination: string;
  default_weight: number;
  sampling_miles: 10 | 25 | 50;
  departure_offset_hours?: number;
  description: string;
}

export interface PlaceSuggestion {
  name: string;
  lat: number;
  lon: number;
  display_name: string;
}
