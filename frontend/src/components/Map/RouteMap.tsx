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
}

type BasemapStyle = 'carto-dark' | 'mapbox-dark' | 'mapbox-satellite';

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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const weatherRadarLayerRef = useRef<L.TileLayer | null>(null);
  const polylinesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const checkpointsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const heatLayerRef = useRef<any>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [showCheckpoints, setShowCheckpoints] = useState(true);
  const [showLiveRadar, setShowLiveRadar] = useState(false);

  const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  const [basemapStyle, setBasemapStyle] = useState<BasemapStyle>(
    mapboxToken ? 'mapbox-dark' : 'carto-dark'
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      center: [39.8283, -98.5795],
      zoom: 4,
    });

    // Default tile layer
    const initialTile = L.tileLayer(
      mapboxToken
        ? `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: mapboxToken
          ? '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; OpenStreetMap'
          : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        tileSize: 512,
        zoomOffset: mapboxToken ? -1 : 0,
      }
    ).addTo(map);

    tileLayerRef.current = initialTile;

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    polylinesLayerGroupRef.current = L.layerGroup().addTo(map);
    checkpointsLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);

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

    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
    let tileSize = 256;
    let zoomOffset = 0;

    if (basemapStyle === 'mapbox-dark' && mapboxToken) {
      url = `https://api.mapbox.com/styles/v1/mapbox/navigation-night-v1/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
      attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a>';
      tileSize = 512;
      zoomOffset = -1;
    } else if (basemapStyle === 'mapbox-satellite' && mapboxToken) {
      url = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
      attribution = '&copy; <a href="https://www.mapbox.com/">Mapbox</a> &copy; Maxar';
      tileSize = 512;
      zoomOffset = -1;
    }

    const newTile = L.tileLayer(url, {
      attribution,
      subdomains: 'abcd',
      maxZoom: 19,
      tileSize,
      zoomOffset,
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

    routes.forEach((route) => {
      const isSelected = route.id === selectedRouteId;
      const latLngs: [number, number][] = route.polyline.map((coord) => [coord[1], coord[0]]);

      if (isSelected) {
        allLatLngs.push(...latLngs);
      }

      if (isSelected) {
        L.polyline(latLngs, {
          color: '#38bdf8',
          weight: 7,
          opacity: 0.9,
          lineJoin: 'round',
        }).addTo(polyGroup);

        L.polyline(latLngs, {
          color: '#0284c7',
          weight: 4,
          opacity: 1,
          lineJoin: 'round',
        }).addTo(polyGroup);
      } else {
        const altLine = L.polyline(latLngs, {
          color: '#64748b',
          weight: 3.5,
          opacity: 0.6,
          dashArray: '6, 6',
          lineJoin: 'round',
        }).addTo(polyGroup);

        altLine.on('click', () => {
          onSelectRoute(route.id);
        });

        altLine.bindTooltip(`${route.name} (${route.duration_formatted})`, {
          sticky: true,
          className: 'custom-tooltip',
        });
      }
    });

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

      const radius = isNoTravel ? 9 : isSevere ? 7.5 : 6;

      const marker = L.circleMarker([cp.lat, cp.lon], {
        radius: radius,
        fillColor: color,
        color: '#ffffff',
        weight: isNoTravel ? 2.5 : 1.5,
        opacity: 1,
        fillOpacity: 0.95,
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
  }, [routes, selectedRouteId, showCheckpoints]);

  // Update Heatmap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (!isHeatmapVisible || !corridorPoints || corridorPoints.length === 0) return;

    const heatData: [number, number, number][] = [];

    corridorPoints.forEach((pt) => {
      const timelinePoint = pt.timeline.find((t) => t.hour_offset === forecastHourOffset) || pt.timeline[0];
      if (!timelinePoint) return;

      let intensity = 0.2;
      switch (activeMetric) {
        case 'wind':
          intensity = Math.min(1.0, Math.max(0.1, timelinePoint.wind_mph / 55.0));
          break;
        case 'rain':
          intensity = Math.min(1.0, Math.max(0.1, timelinePoint.rain_in_hr / 0.8));
          break;
        case 'snow':
          intensity = Math.min(1.0, Math.max(0.1, timelinePoint.snow_in_hr / 2.5));
          break;
        case 'risk':
        default:
          intensity = Math.min(1.0, Math.max(0.15, timelinePoint.risk_score / 5.0));
          break;
      }

      heatData.push([pt.lat, pt.lon, intensity]);
    });

    if (heatData.length > 0 && (L as any).heatLayer) {
      try {
        const heatLayer = (L as any).heatLayer(heatData, {
          radius: 40,
          blur: 28,
          maxZoom: 10,
          max: 1.0,
          gradient: {
            0.15: '#10b981',
            0.40: '#f59e0b',
            0.65: '#f97316',
            0.85: '#ef4444',
            1.00: '#7f1d1d',
          },
        });
        heatLayer.addTo(map);
        heatLayerRef.current = heatLayer;
      } catch (err) {
        console.warn('Heatmap layer error:', err);
      }
    }
  }, [corridorPoints, forecastHourOffset, activeMetric, isHeatmapVisible]);

  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    const activeRoute = routes.find((r) => r.id === selectedRouteId);
    if (!map || !activeRoute || !activeRoute.polyline) return;
    const latLngs: [number, number][] = activeRoute.polyline.map((c) => [c[1], c[0]]);
    map.fitBounds(latLngs, { padding: [50, 50] });
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Map Controls at Top Left */}
      <div className="absolute top-3 left-3 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleFitBounds}
          className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 shadow-lg backdrop-blur-sm transition flex items-center gap-1.5 text-xs font-medium"
          title="Zoom to fit active route"
        >
          <Maximize2 className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Fit Route</span>
        </button>

        <button
          onClick={() => setShowCheckpoints(!showCheckpoints)}
          className={`p-2 rounded-xl border shadow-lg backdrop-blur-sm transition flex items-center gap-1.5 text-xs font-medium ${
            showCheckpoints
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-700/80'
          }`}
          title="Toggle Checkpoints"
        >
          {showCheckpoints ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          <span className="hidden sm:inline">Checkpoints</span>
        </button>

        {/* Live Radar Doppler Toggle (Zero-Secrets Backend Proxy) */}
        <button
          onClick={() => setShowLiveRadar(!showLiveRadar)}
          className={`p-2 rounded-xl border shadow-lg backdrop-blur-sm transition flex items-center gap-1.5 text-xs font-medium ${
            showLiveRadar
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : 'bg-slate-900/90 text-slate-400 border-slate-700/80'
          }`}
          title="Toggle Live Doppler Radar (Precipitation)"
        >
          <CloudRain className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Live Radar</span>
        </button>

        {/* Mapbox Basemap Switcher if Mapbox Token is configured */}
        {mapboxToken && (
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-lg backdrop-blur-sm gap-1 text-[11px]">
            <Map className="w-3.5 h-3.5 text-sky-400 ml-1" />
            <button
              onClick={() => setBasemapStyle('mapbox-dark')}
              className={`px-2 py-0.5 rounded-lg transition ${
                basemapStyle === 'mapbox-dark' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              HD Dark
            </button>
            <button
              onClick={() => setBasemapStyle('mapbox-satellite')}
              className={`px-2 py-0.5 rounded-lg transition ${
                basemapStyle === 'mapbox-satellite' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setBasemapStyle('carto-dark')}
              className={`px-2 py-0.5 rounded-lg transition ${
                basemapStyle === 'carto-dark' ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Carto
            </button>
          </div>
        )}
      </div>

      {/* Floating Map Legend at Bottom Left */}
      <div className="absolute bottom-4 left-3 z-30">
        <MapLegend />
      </div>
    </div>
  );
};
