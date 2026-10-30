import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { RouteInputForm } from './components/RouteInputForm';
import { RouteComparison } from './components/RouteComparison';
import { RouteMap } from './components/Map/RouteMap';
import { ForecastSlider } from './components/ForecastSlider';
import type { HeatmapMetric } from './components/ForecastSlider';
import { CheckpointDetails } from './components/CheckpointDetails';
import { RiskRulesModal } from './components/RiskRulesModal';
import { calculateRoutes, fetchPresets } from './services/api';
import type { CalculateParams } from './services/api';
import type { RouteCalculateResponse, PresetRoute } from './types';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [routeData, setRouteData] = useState<RouteCalculateResponse | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [forecastHourOffset, setForecastHourOffset] = useState<number>(0);
  const [activeHeatmapMetric, setActiveHeatmapMetric] = useState<HeatmapMetric>('risk');
  const [isHeatmapVisible, setIsHeatmapVisible] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [presets, setPresets] = useState<PresetRoute[]>([]);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  const handleCalculate = async (params: CalculateParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await calculateRoutes(params);
      setRouteData(data);
      setSelectedRouteId(data.recommended_route_id || (data.routes[0] && data.routes[0].id) || '');
      setForecastHourOffset(0);
    } catch (err: any) {
      setError(err.message || 'An error occurred while calculating routes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      const p = await fetchPresets();
      setPresets(p);

      handleCalculate({
        origin: 'Chicago, IL',
        destination: 'Denver, CO',
        departure_time: new Date().toISOString(),
        load_weight_lbs: 42000,
        sampling_miles: 25,
      });
    }
    init();
  }, []);

  const selectedRoute = routeData?.routes.find((r) => r.id === selectedRouteId) || routeData?.routes[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar onOpenRules={() => setIsRulesModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 flex items-start justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="text-sm font-medium">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400 hover:text-white underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-12">
            <RouteInputForm
              onCalculate={handleCalculate}
              isLoading={isLoading}
              presets={presets}
            />
          </div>
        </div>

        {routeData && (
          <div className="space-y-6">
            <RouteComparison
              routes={routeData.routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              recommendationSummary={routeData.recommendation_summary}
              loadWeightLbs={routeData.load_weight_lbs}
            />

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  <h3 className="font-bold text-white text-base">
                    Trip Corridor Interactive Weather Map
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    Active: <strong className="text-sky-400">{selectedRoute?.name}</strong>
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>Departure:</span>
                  <span className="font-bold text-slate-200 font-mono">
                    {routeData.departure_time_formatted}
                  </span>
                </div>
              </div>

              <RouteMap
                routes={routeData.routes}
                selectedRouteId={selectedRouteId}
                onSelectRoute={(id) => setSelectedRouteId(id)}
                corridorPoints={routeData.corridor_forecast_48h}
                forecastHourOffset={forecastHourOffset}
                activeMetric={activeHeatmapMetric}
                isHeatmapVisible={isHeatmapVisible}
                origin={routeData.origin}
                destination={routeData.destination}
              />

              <ForecastSlider
                departureTimeIso={routeData.departure_time}
                currentHourOffset={forecastHourOffset}
                onHourChange={(hr) => setForecastHourOffset(hr)}
                activeMetric={activeHeatmapMetric}
                onMetricChange={(m) => setActiveHeatmapMetric(m)}
                isHeatmapVisible={isHeatmapVisible}
                onToggleHeatmap={() => setIsHeatmapVisible(!isHeatmapVisible)}
              />
            </div>

            {selectedRoute && <CheckpointDetails route={selectedRoute} />}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Weather-Aware Truck Routing Engine • Full Stack Developer Assessment • Spotter
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Django 5 REST API</span>
            <span>React + TypeScript + Vite</span>
            <span>Open-Meteo & OSRM</span>
          </div>
        </div>
      </footer>

      <RiskRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
};

export default App;
