import React, { useState } from 'react';
import type { RouteOption } from '../types';
import { RiskBadge } from './RiskBadge';
import {
  ListFilter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CheckpointDetailsProps {
  route: RouteOption;
}

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
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              Checkpoint Weather & Risk Itinerary
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                {route.name}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Sampled every {route.step_miles} miles with vehicle ETA progression
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs gap-1">
            {['ALL', 'HAZARDS', 'HIGH', 'SEVERE', 'NO_TRAVEL'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterSeverity(f)}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterSeverity === f
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'ALL' ? 'All Checkpoints' : f === 'HAZARDS' ? 'Hazards Only' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Table */}
      {!isCollapsed && (
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
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
      )}
    </div>
  );
};
