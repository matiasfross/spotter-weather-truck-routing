import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import type { RouteOption, CorridorPoint } from '../../types';
import type { HeatmapMetric } from '../ForecastSlider';
import { MapLegend } from './MapLegend';
import { getRiskColor } from '../../utils/formatting';
import { Maximize2, Eye, EyeOff, Map, CloudRain } from 'lucide-react';

interface RouteMapProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  corridorPoints: CorridorPoint[];
  forecastHourOffset: number;
  activeMetric: HeatmapMetric;
  isHeatmapVisible: boolean;
  origin?: { name: string; lat: number; lon: number };
  destination?: { name: string; lat: number; lon: number };
  loadWeightLbs?: number;
  onSelectHourOffset?: (hour: number) => void;
}

type BasemapStyle = 'esri-dark' | 'mapbox-dark' | 'mapbox-satellite';

const ESRI_DARK_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a> &copy; OpenStreetMap contributors';

export const RouteMap: React.FC<RouteMapProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  corridorPoints,
  forecastHourOffset,
  activeMetric,
  isHeatmapVisible,
  origin,
  destination,
  loadWeightLbs = 35000,
  onSelectHourOffset,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const weatherRadarLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const checkpointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const timelapseLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [showCheckpoints, setShowCheckpoints] = useState(true);
  const [showLiveRadar, setShowLiveRadar] = useState(false);

  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>(
    mapboxToken ? 'mapbox-dark' : 'esri-dark'
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      center: [39.8283, -98.5795],
      zoom: 4,
      minZoom: 3,
      maxZoom: 18,
    });

    // Default tile layer: Mapbox HD Retina 256px if token present, otherwise clean Esri Dark Gray (no watermarks)
    const initialTile = L.tileLayer(
      mapboxToken
        ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
        : ESRI_DARK_URL,
      {
        attribution: mapboxToken
          ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap'
          : ESRI_ATTRIBUTION,
        subdomains: 'abcd',
        minZoom: 3,
        maxZoom: 18,
        tileSize: 256,
        zoomOffset: 0,
      }
    ).addTo(map);

    tileLayerRef.current = initialTile;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    if (!map.getPane('checkpointsPane')) {
      const cpPane = map.createPane('checkpointsPane');
      cpPane.style.zIndex = '620';
    }

    polylinesLayerGroupRef.current = L.layerGroup().addTo(map);
    checkpointsLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    timelapseLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap when basemapStyle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let url = ESRI_DARK_URL;
    let attribution = ESRI_ATTRIBUTION;

    if (basemapStyle === 'mapbox-dark' && mapboxToken) {
      url = `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;
      attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a>';
    } else if (basemapStyle === 'mapbox-satellite' && mapboxToken) {
      url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;
      attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; Maxar';
    } else if (basemapStyle === 'esri-dark') {
      url = ESRI_DARK_URL;
      attribution = ESRI_ATTRIBUTION;
    }

    const newTile = L.tileLayer(url, {
      attribution,
      subdomains: 'abcd',
      minZoom: 3,
      maxZoom: 18,
      tileSize: 256,
      zoomOffset: 0,
    }).addTo(map);

    // Bring under vector layers
    newTile.bringToBack();
    tileLayerRef.current = newTile;
  }, [basemapStyle, mapboxToken]);

  // Toggle Live Weather Radar layer securely via Backend Proxy
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (weatherRadarLayerRef.current) {
      map.removeLayer(weatherRadarLayerRef.current);
      weatherRadarLayerRef.current = null;
    }

    if (showLiveRadar) {
      const radar = L.tileLayer(
        `${apiBaseUrl}/routes/radar-tile/precipitation_new/{z}/{x}/{y}.png`,
        {
          attribution: '&copy; Live Radar (Backend Proxy)',
          opacity: 0.7,
          maxZoom: 18,
        }
      ).addTo(map);
      weatherRadarLayerRef.current = radar;
    }
  }, [showLiveRadar, apiBaseUrl]);

  // Update Route Polylines and Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyGroup = polylinesLayerGroupRef.current;
    const markerGroup = markersLayerGroupRef.current;
    if (!map || !polyGroup || !markerGroup) return;

    polyGroup.clearLayers();
    markerGroup.clearLayers();

    if (!routes || routes.length === 0) return;

    const allLatLngs: [number, number][] = [];

    if (origin) {
      const originIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div class="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([origin.lat, origin.lon], { icon: originIcon })
        .bindPopup(`<strong>Origin:</strong> ${origin.name}`)
        .addTo(markerGroup);
      allLatLngs.push([origin.lat, origin.lon]);
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-pin',
        html: `<div class="w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([destination.lat, destination.lon], { icon: destIcon })
        .bindPopup(`<strong>Destination:</strong> ${destination.name}`)
        .addTo(markerGroup);
      allLatLngs.push([destination.lat, destination.lon]);
    }

    // Separate unselected and selected routes so selected route renders cleanly on top
    const unselectedRoutes = routes.filter((r) => r.id !== selectedRouteId);
    const selectedRoute = routes.find((r) => r.id === selectedRouteId);

    // 1. Draw unselected routes with high-contrast dual casing (dark border + bright silver core)
    unselectedRoutes.forEach((route) => {
      const latLngs: [number, number][] = route.polyline.map((coord) => [coord[1], coord[0]]);

      // Dark underlay border to contrast against any road, ocean, or terrain
      L.polyline(latLngs, {
        color: '#020617',
        weight: 6,
        opacity: 0.85,
        lineJoin: 'round',
      }).addTo(polyGroup);

      // High-contrast luminous slate-200 foreground line
      const altLine = L.polyline(latLngs, {
        color: '#cbd5e1',
        weight: 4,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(polyGroup);

      altLine.on('mouseover', () => {
        altLine.setStyle({ color: '#ffffff', weight: 5.5 });
      });

      altLine.on('mouseout', () => {
        altLine.setStyle({ color: '#cbd5e1', weight: 4 });
      });

      altLine.on('click', () => {
        onSelectRoute(route.id);
      });

      altLine.bindTooltip(
        `<strong>${route.name}</strong> • ${route.duration_formatted} • ${route.distance_miles.toFixed(0)} mi<br/><span style="font-size: 10px; color: #38bdf8;">Click to switch to this route</span>`,
        {
          sticky: true,
          className: 'custom-tooltip',
        }
      );
    });

    // 2. Draw selected route on top with vibrant cyan double-layer
    if (selectedRoute) {
      const latLngs: [number, number][] = selectedRoute.polyline.map((coord) => [coord[1], coord[0]]);
      allLatLngs.push(...latLngs);

      // Outer glow
      L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 8,
        opacity: 0.9,
        lineJoin: 'round',
      }).addTo(polyGroup);

      // Core line
      L.polyline(latLngs, {
        color: '#0284c7',
        weight: 4.5,
        opacity: 1,
        lineJoin: 'round',
      }).addTo(polyGroup);
    }

    if (allLatLngs.length > 0) {
      const bounds = L.latLngBounds(allLatLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [routes, selectedRouteId, origin, destination, onSelectRoute]);

  // Update Checkpoints
  useEffect(() => {
    const cpGroup = checkpointsLayerGroupRef.current;
    if (!cpGroup) return;

    cpGroup.clearLayers();

    if (!showCheckpoints) return;

    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    if (!activeRoute || !activeRoute.checkpoints) return;

    activeRoute.checkpoints.forEach((cp) => {
      const risk = cp.risk;
      const weather = cp.weather;
      const color = getRiskColor(risk.overall_risk);
      const isNoTravel = risk.is_no_travel;
      const isSevere = risk.overall_risk === 'SEVERE';

      const radius = isNoTravel ? 11 : isSevere ? 9.5 : 8;

      const marker = L.circleMarker([cp.lat, cp.lon], {
        pane: 'checkpointsPane',
        className: 'checkpoint-marker-interactive',
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95,
      });

      marker.on('click', () => {
        if (onSelectHourOffset) {
          const cpOffset = Math.round((cp.cumulative_duration_seconds / 3600) * 4) / 4;
          onSelectHourOffset(cpOffset);
        }
      });

      const popupHtml = `
        <div class="p-1 space-y-2 text-xs">
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
            <span class="font-bold text-slate-100 font-mono">Mile ${cp.distance_from_origin_miles.toFixed(1)}</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style="background-color: ${color}25; color: ${color}; border: 1px solid ${color}60">
              ${risk.overall_risk_label}
            </span>
          </div>

          <div class="space-y-1 font-mono text-[11px]">
            <div class="flex justify-between text-slate-300">
              <span>ETA:</span>
              <strong class="text-white">${cp.eta_formatted}</strong>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Conditions:</span>
              <span class="text-sky-300">${weather.description} (${weather.temperature_f}°F)</span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Wind Speed:</span>
              <span class="font-bold ${weather.wind_speed_mph >= 35 ? 'text-orange-400' : 'text-white'}">
                ${weather.wind_speed_mph} mph (${risk.wind.risk_label})
              </span>
            </div>
            <div class="flex justify-between text-slate-300">
              <span>Precip / Rain:</span>
              <span class="${weather.rain_in_hr >= 0.25 ? 'text-blue-400 font-bold' : 'text-slate-300'}">
                ${weather.rain_in_hr} in/hr (${risk.rain.risk_label})
              </span>
            </div>
            ${
              weather.snow_in_hr > 0
                ? `<div class="flex justify-between text-slate-300">
                    <span>Snowfall:</span>
                    <span class="text-cyan-300 font-bold">${weather.snow_in_hr} in/hr (${risk.snow.risk_label})</span>
                   </div>`
                : ''
            }
          </div>

          ${
            risk.hazard_reasons && risk.hazard_reasons.length > 0
              ? `<div class="pt-1.5 border-t border-slate-800 text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded space-y-1">
                  ${risk.hazard_reasons.map((r) => `<div>• ${r}</div>`).join('')}
                 </div>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });
      marker.addTo(cpGroup);
    });
  }, [routes, selectedRouteId, showCheckpoints, onSelectHourOffset]);

  // Update Timelapse Vehicle Position & Progress Line on Active Route
  useEffect(() => {
    const tlGroup = timelapseLayerGroupRef.current;
    if (!tlGroup) return;

    tlGroup.clearLayers();

    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    if (!activeRoute || !activeRoute.polyline || activeRoute.polyline.length === 0) return;

    const coords = activeRoute.polyline; // [[lon, lat], ...]
    const totalDurationSec = activeRoute.duration_seconds || 1;
    const totalMiles = activeRoute.distance_miles || 0;

    // Calculate progress ratio
    const currentElapsedSec = forecastHourOffset * 3600;
    const progressRatio = Math.min(1.0, Math.max(0.0, currentElapsedSec / totalDurationSec));
    const isCompleted = currentElapsedSec >= totalDurationSec;

    // Haversine helper for fast local polyline interpolation
    const haversineDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 3958.8;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Calculate cumulative distances along polyline
    const cumulativeDistances: number[] = [0];
    let totalPolyDist = 0;
    for (let i = 1; i < coords.length; i++) {
      const p1 = coords[i - 1];
      const p2 = coords[i];
      const d = haversineDist(p1[1], p1[0], p2[1], p2[0]);
      totalPolyDist += d;
      cumulativeDistances.push(totalPolyDist);
    }

    const targetDistance = totalPolyDist * progressRatio;

    // Find interpolation index along polyline
    let currentIdx = 0;
    let currentLat = coords[0][1];
    let currentLon = coords[0][0];

    for (let i = 1; i < cumulativeDistances.length; i++) {
      if (cumulativeDistances[i] >= targetDistance) {
        currentIdx = i;
        const span = cumulativeDistances[i] - cumulativeDistances[i - 1];
        const frac = span > 1e-6 ? (targetDistance - cumulativeDistances[i - 1]) / span : 0;
        currentLat = coords[i - 1][1] + frac * (coords[i][1] - coords[i - 1][1]);
        currentLon = coords[i - 1][0] + frac * (coords[i][0] - coords[i - 1][0]);
        break;
      }
      if (i === cumulativeDistances.length - 1) {
        currentIdx = i;
        currentLat = coords[i][1];
        currentLon = coords[i][0];
      }
    }

    const currentTraveledMiles = Math.min(totalMiles, totalMiles * progressRatio);

    // 1. Draw High-Contrast Traveled Progress Line (when offset > 0)
    if (forecastHourOffset > 0 && currentIdx > 0) {
      const traveledLatLngs: [number, number][] = [];
      for (let i = 0; i < currentIdx; i++) {
        traveledLatLngs.push([coords[i][1], coords[i][0]]);
      }
      traveledLatLngs.push([currentLat, currentLon]);

      // Ultra-bold dark casing for 100% contrast against any background
      L.polyline(traveledLatLngs, {
        color: '#020617',
        weight: 9,
        opacity: 0.95,
        lineJoin: 'round',
      }).addTo(tlGroup);

      // Luminous electric cyan foreground line
      L.polyline(traveledLatLngs, {
        color: '#00f0ff',
        weight: 5.5,
        opacity: 1,
        lineJoin: 'round',
      }).addTo(tlGroup);
    }

    // 2. High-Contrast Truck Beacon Marker with Glowing Pulse
    const hrs = Math.floor(forecastHourOffset);
    const mins = Math.round((forecastHourOffset - hrs) * 60);
    const offsetFormatted = mins > 0 ? `+${hrs}h ${mins}m` : `+${hrs}h`;
    const percentFormatted = Math.round(progressRatio * 100);
    const labelText = isCompleted
      ? `🎉 Arrived at Destination • ${totalMiles.toFixed(0)} mi (${offsetFormatted})`
      : `🚚 ${offsetFormatted} • Mile ${currentTraveledMiles.toFixed(1)} / ${totalMiles.toFixed(0)} mi (${percentFormatted}%)`;

    const truckIconHtml = `
      <div class="timelapse-truck-container">
        <div class="timelapse-beacon-pulse"></div>
        <div class="timelapse-truck-badge">
          <svg class="w-3.5 h-3.5 fill-white text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </div>
      </div>
    `;

    const truckIcon = L.divIcon({
      className: 'timelapse-truck-div-icon',
      html: truckIconHtml,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const truckMarker = L.marker([currentLat, currentLon], {
      icon: truckIcon,
      zIndexOffset: 2000,
    }).addTo(tlGroup);

    truckMarker.bindTooltip(
      `<div class="font-mono text-xs font-bold text-white px-1 whitespace-nowrap">${labelText}</div>`,
      {
        permanent: true,
        direction: 'top',
        offset: [0, -18],
        className: 'custom-tooltip',
      }
    );
  }, [routes, selectedRouteId, forecastHourOffset]);

  // Classifiers strictly implementing the Risk Rules from fs-assessment-spotter.pdf
  const classifyConditionPerPdf = (
    metric: HeatmapMetric,
    timelinePoint: any,
    truckWeightLbs: number
  ) => {
    const windMph = timelinePoint.wind_mph || 0;
    const rainInHr = timelinePoint.rain_in_hr || 0;
    const snowInHr = timelinePoint.snow_in_hr || 0;

    // 1. Wind Rules (Page 1 & 2 of PDF):
    // < 25 Low, 25-34 Moderate, 35-44 High, 45-54 Severe, >= 55 No Travel
    // Load rules: >= 55 No Travel; 45-54 + >30,000 lb No Travel; 35-44 + >40,000 lb Severe
    let windLevel = 'LOW';
    let windScore = 1;
    let windColor = '#10b981';
    let windDesc = `${windMph.toFixed(1)} mph (< 25 mph)`;

    if (windMph >= 55.0) {
      windLevel = 'NO_TRAVEL';
      windScore = 5;
      windColor = '#7f1d1d';
      windDesc = `${windMph.toFixed(1)} mph (≥ 55 mph)`;
    } else if (windMph >= 45.0) {
      if (truckWeightLbs > 30000) {
        windLevel = 'NO_TRAVEL';
        windScore = 5;
        windColor = '#7f1d1d';
        windDesc = `${windMph.toFixed(1)} mph + >30k lb`;
      } else {
        windLevel = 'SEVERE';
        windScore = 4;
        windColor = '#ef4444';
        windDesc = `${windMph.toFixed(1)} mph (45–54 mph)`;
      }
    } else if (windMph >= 35.0) {
      if (truckWeightLbs > 40000) {
        windLevel = 'SEVERE';
        windScore = 4;
        windColor = '#ef4444';
        windDesc = `${windMph.toFixed(1)} mph + >40k lb`;
      } else {
        windLevel = 'HIGH';
        windScore = 3;
        windColor = '#f97316';
        windDesc = `${windMph.toFixed(1)} mph (35–44 mph)`;
      }
    } else if (windMph >= 25.0) {
      windLevel = 'MODERATE';
      windScore = 2;
      windColor = '#f59e0b';
      windDesc = `${windMph.toFixed(1)} mph (25–34 mph)`;
    }

    // 2. Rain Rules (Page 1 of PDF):
    // < 0.10 Low, 0.10-0.25 Moderate, 0.25-0.50 High, 0.50-1.00 Severe, > 1.00 No Travel
    let rainLevel = 'LOW';
    let rainScore = 1;
    let rainColor = '#10b981';
    let rainDesc = `${rainInHr.toFixed(2)} in/hr (< 0.10 in/hr)`;

    if (rainInHr > 1.0) {
      rainLevel = 'NO_TRAVEL';
      rainScore = 5;
      rainColor = '#7f1d1d';
      rainDesc = `${rainInHr.toFixed(2)} in/hr (> 1.00 in/hr)`;
    } else if (rainInHr >= 0.5) {
      rainLevel = 'SEVERE';
      rainScore = 4;
      rainColor = '#ef4444';
      rainDesc = `${rainInHr.toFixed(2)} in/hr (0.50–1.00 in/hr)`;
    } else if (rainInHr >= 0.25) {
      rainLevel = 'HIGH';
      rainScore = 3;
      rainColor = '#f97316';
      rainDesc = `${rainInHr.toFixed(2)} in/hr (0.25–0.50 in/hr)`;
    } else if (rainInHr >= 0.10) {
      rainLevel = 'MODERATE';
      rainScore = 2;
      rainColor = '#f59e0b';
      rainDesc = `${rainInHr.toFixed(2)} in/hr (0.10–0.25 in/hr)`;
    }

    // 3. Snow Rules (Page 1 of PDF):
    // < 0.5 Low, 0.5-1.0 Moderate, 1.0-2.0 High, 2.0-3.0 Severe, > 3.0 No Travel
    let snowLevel = 'LOW';
    let snowScore = 1;
    let snowColor = '#10b981';
    let snowDesc = `${snowInHr.toFixed(2)} in/hr (< 0.5 in/hr)`;

    if (snowInHr > 3.0) {
      snowLevel = 'NO_TRAVEL';
      snowScore = 5;
      snowColor = '#7f1d1d';
      snowDesc = `${snowInHr.toFixed(2)} in/hr (> 3.0 in/hr)`;
    } else if (snowInHr >= 2.0) {
      snowLevel = 'SEVERE';
      snowScore = 4;
      snowColor = '#ef4444';
      snowDesc = `${snowInHr.toFixed(2)} in/hr (2.0–3.0 in/hr)`;
    } else if (snowInHr >= 1.0) {
      snowLevel = 'HIGH';
      snowScore = 3;
      snowColor = '#f97316';
      snowDesc = `${snowInHr.toFixed(2)} in/hr (1.0–2.0 in/hr)`;
    } else if (snowInHr >= 0.5) {
      snowLevel = 'MODERATE';
      snowScore = 2;
      snowColor = '#f59e0b';
      snowDesc = `${snowInHr.toFixed(2)} in/hr (0.5–1.0 in/hr)`;
    }

    // Select active metric classification
    if (metric === 'wind') {
      return {
        level: windLevel,
        score: windScore,
        color: windColor,
        description: windDesc,
        intensity: windScore <= 1 ? 0.0 : windScore === 2 ? 0.35 : windScore === 3 ? 0.65 : windScore === 4 ? 0.85 : 1.0,
      };
    }
    if (metric === 'rain') {
      return {
        level: rainLevel,
        score: rainScore,
        color: rainColor,
        description: rainDesc,
        intensity: rainScore <= 1 ? 0.0 : rainScore === 2 ? 0.35 : rainScore === 3 ? 0.65 : rainScore === 4 ? 0.85 : 1.0,
      };
    }
    if (metric === 'snow') {
      return {
        level: snowLevel,
        score: snowScore,
        color: snowColor,
        description: snowDesc,
        intensity: snowScore <= 1 ? 0.0 : snowScore === 2 ? 0.35 : snowScore === 3 ? 0.65 : snowScore === 4 ? 0.85 : 1.0,
      };
    }

    // Default: Overall Composite Truck Risk = max of wind, rain, snow
    const maxScore = Math.max(windScore, rainScore, snowScore, timelinePoint.risk_score || 1);
    const overallColor =
      maxScore >= 5 ? '#7f1d1d' :
      maxScore === 4 ? '#ef4444' :
      maxScore === 3 ? '#f97316' :
      maxScore === 2 ? '#f59e0b' : '#10b981';
    const overallLevel =
      maxScore >= 5 ? 'NO_TRAVEL' :
      maxScore === 4 ? 'SEVERE' :
      maxScore === 3 ? 'HIGH' :
      maxScore === 2 ? 'MODERATE' : 'LOW';

    return {
      level: overallLevel,
      score: maxScore,
      color: overallColor,
      description: `Composite: ${overallLevel}`,
      intensity: maxScore <= 1 ? 0.0 : maxScore === 2 ? 0.35 : maxScore === 3 ? 0.65 : maxScore === 4 ? 0.85 : 1.0,
    };
  };

  // Update Corridor Heatmap strictly following PDF Risk Rules (dynamically linked to the timelapse hour)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isHeatmapVisible || !corridorPoints || corridorPoints.length === 0) {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
      return;
    }

    const heatData: [number, number, number][] = [];

    // Filter points strictly for the active route if a route is selected
    const activeRouteCorridorPoints = selectedRouteId
      ? corridorPoints.filter((pt) => !pt.route_id || pt.route_id === selectedRouteId)
      : corridorPoints;

    const lowerHour = Math.min(48, Math.max(0, Math.floor(forecastHourOffset)));
    const upperHour = Math.min(48, Math.max(0, Math.ceil(forecastHourOffset)));
    const frac = forecastHourOffset - lowerHour;

    activeRouteCorridorPoints.forEach((pt) => {
      const lowerTp = pt.timeline.find((t) => t.hour_offset === lowerHour) || pt.timeline[0];
      const upperTp = pt.timeline.find((t) => t.hour_offset === upperHour) || lowerTp;

      if (!lowerTp) return;

      // Continuous weather interpolation between hours for smooth timelapse transition
      let timelinePoint = lowerTp;
      if (lowerHour !== upperHour && upperTp) {
        timelinePoint = {
          ...lowerTp,
          wind_mph: lowerTp.wind_mph * (1 - frac) + upperTp.wind_mph * frac,
          rain_in_hr: lowerTp.rain_in_hr * (1 - frac) + upperTp.rain_in_hr * frac,
          snow_in_hr: lowerTp.snow_in_hr * (1 - frac) + upperTp.snow_in_hr * frac,
          risk_score: Math.max(lowerTp.risk_score, upperTp.risk_score),
        };
      }

      const classification = classifyConditionPerPdf(activeMetric, timelinePoint, loadWeightLbs);

      // Only add elevated hazards (score > 1) to heatData to prevent safe areas from falsely blending into orange
      if (classification.score > 1 && classification.intensity > 0) {
        heatData.push([pt.lat, pt.lon, classification.intensity]);
      }
    });

    if (heatLayerRef.current) {
      if (heatData.length > 0) {
        heatLayerRef.current.setLatLngs(heatData);
      } else {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    } else if (heatData.length > 0 && (L as any).heatLayer) {
      try {
        const heatLayer = (L as any).heatLayer(heatData, {
          radius: 25,
          blur: 12,
          maxZoom: 16,
          max: 2.0, // Prevents adjacent points from multiplying into false higher hazards
          minOpacity: 0.45,
          gradient: {
            0.35: '#f59e0b', // Moderate (Amber)
            0.65: '#f97316', // High (Orange)
            0.85: '#ef4444', // Severe (Red)
            1.00: '#7f1d1d', // No Travel (Dark Red)
          },
        });
        heatLayer.addTo(map);
        heatLayerRef.current = heatLayer;
      } catch (err) {
        console.warn('Heatmap layer error:', err);
      }
    }
  }, [corridorPoints, forecastHourOffset, activeMetric, isHeatmapVisible, loadWeightLbs, selectedRouteId]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    if (!map || !activeRoute || !activeRoute.polyline) return;
    const latLngs: [number, number][] = activeRoute.polyline.map((c) => [c[1], c[0]]);
    map.fitBounds(latLngs, { padding: [50, 50] });
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 isolate">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls at Top Left - Layer 1000 to stay permanently above all Leaflet panes */}
      <div
        className="absolute top-3 left-3 z-[1000] flex flex-col gap-2 pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleFitBounds}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 shadow-lg backdrop-blur-sm transition flex items-center gap-1.5 text-[11px] sm:text-xs font-medium cursor-pointer"
          title="Zoom to fit active route"
        >
          <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
          <span>Fit Route</span>
        </button>

        <button
          onClick={() => setShowCheckpoints(!showCheckpoints)}
          className={`p-1.5 sm:p-2 rounded-xl border shadow-lg backdrop-blur-sm transition flex items-center gap-1.5 text-[11px] sm:text-xs font-medium cursor-pointer ${
            showCheckpoints
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-700/80'
          }`}
          title="Toggle Checkpoints"
        >
          {showCheckpoints ? <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          <span>Checkpoints</span>
        </button>

        {/* Live Radar Doppler Toggle (Zero-Secrets Backend Proxy) */}
        <button
          onClick={() => setShowLiveRadar(!showLiveRadar)}
          className={`p-1.5 sm:p-2 rounded-xl border shadow-lg backdrop-blur-sm transition flex items-center gap-1.5 text-[11px] sm:text-xs font-medium cursor-pointer ${
            showLiveRadar
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-700/80'
          }`}
          title="Toggle Live Doppler Radar (Precipitation)"
        >
          <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
          <span>Live Radar</span>
        </button>

        {/* Mapbox Basemap Switcher if Mapbox Token is configured */}
        {mapboxToken && (
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-lg backdrop-blur-sm gap-1 text-[11px]">
            <Map className="w-3.5 h-3.5 text-sky-400 ml-1" />
            <button
              onClick={() => setBasemapStyle('mapbox-dark')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                basemapStyle === 'mapbox-dark' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              HD Dark
            </button>
            <button
              onClick={() => setBasemapStyle('mapbox-satellite')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                basemapStyle === 'mapbox-satellite' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setBasemapStyle('esri-dark')}
              className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                basemapStyle === 'esri-dark' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Esri Dark
            </button>
          </div>
        )}
      </div>

      {/* Floating Map Legend at Bottom Left - Layer 1000 */}
      <div
        className="absolute bottom-4 left-3 z-[1000] pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <MapLegend />
      </div>
    </div>
  );
};
