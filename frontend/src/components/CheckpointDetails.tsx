import React, { useState } from 'react';
import type { RouteOption } from '../types';
import { RiskBadge } from './RiskBadge';
import {
  ListFilter,
  ChevronDown,
  ChevronUp,
  Wind,
  CloudRain,
  Snowflake,
  AlertTriangle,
} from 'lucide-react';

interface CheckpointDetailsProps {
  route: RouteOption;
}

const filterLabels: Record<string, { full: string; short: string }> = {
  ALL: { full: 'All Checkpoints', short: 'All' },
  HAZARDS: { full: 'Hazards Only', short: 'Hazards' },
  HIGH: { full: 'High Risk', short: 'High' },
  SEVERE: { full: 'Severe', short: 'Severe' },
  NO_TRAVEL: { full: 'No Travel', short: 'No Travel' },
};

export const CheckpointDetails: React.FC<CheckpointDetailsProps> = ({ route }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const checkpoints = route.checkpoints || [];

  const filteredCheckpoints = checkpoints.filter((cp) => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'HAZARDS') return cp.risk.overall_risk !== 'LOW';
    return cp.risk.overall_risk === filterSeverity;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>Checkpoint Weather & Risk Itinerary</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                {route.name}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Sampled every {route.step_miles} miles with vehicle ETA progression ({filteredCheckpoints.length} stops)
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 max-w-full">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs gap-1 overflow-x-auto max-w-[calc(100vw-80px)] sm:max-w-none">
            {['ALL', 'HAZARDS', 'HIGH', 'SEVERE', 'NO_TRAVEL'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterSeverity(f)}
                className={`px-2.5 py-1 rounded-lg font-medium transition shrink-0 whitespace-nowrap cursor-pointer ${
                  filterSeverity === f
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="inline sm:hidden">{filterLabels[f]?.short || f}</span>
                <span className="hidden sm:inline">{filterLabels[f]?.full || f}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer shrink-0"
            title={isCollapsed ? 'Expand itinerary' : 'Collapse itinerary'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content: Dual View (Mobile Cards + Desktop Table) */}
      {!isCollapsed && (
        <>
          {/* Mobile Card Itinerary View (block md:hidden) */}
          <div className="block md:hidden max-h-[460px] overflow-y-auto p-3 space-y-2.5 bg-slate-950/40">
            {filteredCheckpoints.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs font-sans">
                No checkpoints match the selected hazard filter.
              </div>
            ) : (
              filteredCheckpoints.map((cp) => {
                const risk = cp.risk;
                const weather = cp.weather;
                const isNoTravel = risk.overall_risk === 'NO_TRAVEL';
                const isSevere = risk.overall_risk === 'SEVERE';
                const isHigh = risk.overall_risk === 'HIGH';

                return (
                  <div
                    key={cp.index}
                    className={`p-3 rounded-xl border transition space-y-2.5 ${
                      isNoTravel
                        ? 'bg-red-950/25 border-red-500/50 shadow-sm shadow-red-950/50'
                        : isSevere
                        ? 'bg-red-950/15 border-red-500/30'
                        : isHigh
                        ? 'bg-amber-950/15 border-amber-500/30'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Header: Milestone + ETA + Risk Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-mono font-bold text-xs border border-slate-700">
                          Mile {cp.distance_from_origin_miles.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-300 font-mono">
                          {cp.eta_formatted}
                        </span>
                      </div>
                      <RiskBadge level={risk.overall_risk} label={risk.overall_risk_label} size="sm" />
                    </div>

                    {/* Conditions and Temperature */}
                    <div className="flex items-center justify-between text-xs text-slate-200">
                      <span>{weather.description}</span>
                      <span className="font-mono text-slate-400 font-semibold">{weather.temperature_f}°F</span>
                    </div>

                    {/* Weather Metrics 3-column Grid */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                          <Wind className="w-3 h-3 text-sky-400" />
                          Wind
                        </span>
                        <span className={`font-bold mt-0.5 ${weather.wind_speed_mph >= 35 ? 'text-orange-400' : 'text-slate-200'}`}>
                          {weather.wind_speed_mph} mph
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                          <CloudRain className="w-3 h-3 text-blue-400" />
                          Precip
                        </span>
                        <span className={`font-bold mt-0.5 ${weather.rain_in_hr >= 0.25 ? 'text-blue-400' : 'text-slate-200'}`}>
                          {weather.rain_in_hr} in/h
                        </span>
                      </div>

                      <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
                          <Snowflake className="w-3 h-3 text-cyan-300" />
                          Snow
                        </span>
                        <span className={`font-bold mt-0.5 ${weather.snow_in_hr > 0 ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {weather.snow_in_hr} in/h
                        </span>
                      </div>
                    </div>

                    {/* Active Hazard Rules Reasons */}
                    {risk.hazard_reasons && risk.hazard_reasons.length > 0 && (
                      <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className={risk.load_rule_applied ? 'text-amber-300 font-medium' : 'text-slate-300'}>
                          {risk.hazard_reasons.join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 shadow-sm z-10">
                <tr>
                  <th className="py-2.5 px-4">Milestone</th>
                  <th className="py-2.5 px-4">ETA</th>
                  <th className="py-2.5 px-4">Conditions</th>
                  <th className="py-2.5 px-4">Wind (mph)</th>
                  <th className="py-2.5 px-4">Precip (in/hr)</th>
                  <th className="py-2.5 px-4">Snow (in/hr)</th>
                  <th className="py-2.5 px-4">Overall Risk</th>
                  <th className="py-2.5 px-4">Active Rule Reasons</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                {filteredCheckpoints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                      No checkpoints match the selected hazard filter.
                    </td>
                  </tr>
                ) : (
                  filteredCheckpoints.map((cp) => {
                    const risk = cp.risk;
                    const weather = cp.weather;
                    return (
                      <tr
                        key={cp.index}
                        className={`hover:bg-slate-800/40 transition ${
                          risk.overall_risk === 'NO_TRAVEL'
                            ? 'bg-red-950/20'
                            : risk.overall_risk === 'SEVERE'
                            ? 'bg-red-950/10'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-bold text-white">
                          Mile {cp.distance_from_origin_miles.toFixed(1)}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-300 whitespace-nowrap">
                          {cp.eta_formatted}
                        </td>
                        <td className="py-2.5 px-4 font-sans text-slate-300">
                          {weather.description} ({weather.temperature_f}°F)
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={weather.wind_speed_mph >= 35 ? 'font-bold text-orange-400' : ''}>
                            {weather.wind_speed_mph} mph
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={weather.rain_in_hr >= 0.25 ? 'font-bold text-blue-400' : ''}>
                            {weather.rain_in_hr} in/hr
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={weather.snow_in_hr > 0 ? 'font-bold text-cyan-300' : ''}>
                            {weather.snow_in_hr} in/hr
                          </span>
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <RiskBadge level={risk.overall_risk} label={risk.overall_risk_label} size="sm" />
                        </td>
                        <td className="py-2.5 px-4 font-sans text-[10px] text-slate-400 max-w-xs truncate">
                          {risk.hazard_reasons && risk.hazard_reasons.length > 0 ? (
                            <span className={risk.load_rule_applied ? 'text-amber-300 font-semibold' : ''}>
                              {risk.hazard_reasons[0]}
                            </span>
                          ) : (
                            <span className="text-slate-600">Standard</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
