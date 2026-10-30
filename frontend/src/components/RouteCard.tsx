import React from 'react';
import type { RouteOption } from '../types';
import {
  Clock,
  Navigation,
  Wind,
  CloudRain,
  Snowflake,
  ShieldCheck,
  Flame,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { formatDistance } from '../utils/formatting';

interface RouteCardProps {
  route: RouteOption;
  isSelected: boolean;
  onSelect: () => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  isSelected,
  onSelect,
}) => {
  const summary = route.risk_summary;

  const totalMiles = route.distance_miles || 1;
  const noTravelPct = ((summary.no_travel_miles || 0) / totalMiles) * 100;
  const severePct = ((summary.severe_miles || 0) / totalMiles) * 100;
  const highPct = ((summary.high_miles || 0) / totalMiles) * 100;
  const modPct = ((summary.moderate_miles || 0) / totalMiles) * 100;
  const lowPct = Math.max(0, 100 - (noTravelPct + severePct + highPct + modPct));

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl p-4 transition cursor-pointer border relative overflow-hidden ${
        isSelected
          ? 'bg-slate-900 border-sky-500 ring-2 ring-sky-500/30 shadow-xl shadow-sky-500/10'
          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      {/* Top Banner if Recommended */}
      {route.is_recommended && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          RECOMMENDED ROUTE
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between pr-24 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md bg-slate-800 text-sky-400 border border-slate-700">
              #{route.route_number}
            </span>
            <h3 className="font-bold text-white text-base">{route.name}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{route.title}</p>
          {route.routing_engine && (
            <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">
              Engine: {route.routing_engine}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
            <Navigation className="w-3 h-3 text-sky-400" />
            Distance
          </div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            {formatDistance(route.distance_miles)}
          </div>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            Travel Time
          </div>
          <div className="text-sm font-bold text-white font-mono mt-0.5">
            {route.duration_formatted}
          </div>
        </div>

        <div className={`p-2 rounded-xl border ${summary.severe_and_worse_miles > 0 ? 'bg-red-950/30 border-red-900/50' : 'bg-slate-950/60 border-slate-800/80'}`}>
          <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
            <Flame className={`w-3 h-3 ${summary.severe_and_worse_miles > 0 ? 'text-red-400' : 'text-slate-500'}`} />
            Severe Miles
          </div>
          <div className={`text-sm font-bold font-mono mt-0.5 ${summary.severe_and_worse_miles > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {summary.severe_and_worse_miles.toFixed(1)} mi
          </div>
        </div>

        <div className={`p-2 rounded-xl border ${summary.high_miles > 0 ? 'bg-orange-950/20 border-orange-900/40' : 'bg-slate-950/60 border-slate-800/80'}`}>
          <div className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-orange-400" />
            High Miles
          </div>
          <div className={`text-sm font-bold font-mono mt-0.5 ${summary.high_miles > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
            {summary.high_miles.toFixed(1)} mi
          </div>
        </div>
      </div>

      {/* Multi-segment Risk Progress Bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Risk Profile along corridor:</span>
          <span className="font-semibold text-slate-200">
            Avg Risk: <span style={{ color: summary.average_risk_color }}>{summary.average_risk_label} ({summary.average_risk_score}/5)</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-950 border border-slate-800 flex overflow-hidden">
          {noTravelPct > 0 && (
            <div style={{ width: `${noTravelPct}%` }} className="bg-red-900" title={`No Travel: ${summary.no_travel_miles} mi`} />
          )}
          {severePct > 0 && (
            <div style={{ width: `${severePct}%` }} className="bg-red-500" title={`Severe: ${summary.severe_miles} mi`} />
          )}
          {highPct > 0 && (
            <div style={{ width: `${highPct}%` }} className="bg-orange-500" title={`High: ${summary.high_miles} mi`} />
          )}
          {modPct > 0 && (
            <div style={{ width: `${modPct}%` }} className="bg-amber-500" title={`Moderate: ${summary.moderate_miles} mi`} />
          )}
          {lowPct > 0 && (
            <div style={{ width: `${lowPct}%` }} className="bg-emerald-500" title={`Low: ${summary.low_miles} mi`} />
          )}
        </div>
      </div>

      {/* Max Peak Weather Conditions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Peak Wind Speed">
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <strong className="text-slate-200 font-mono">{summary.max_wind_mph} mph</strong>
          </span>
          <span className="flex items-center gap-1" title="Peak Rain Rate">
            <CloudRain className="w-3.5 h-3.5 text-blue-400" />
            <strong className="text-slate-200 font-mono">{summary.max_rain_in_hr} in/h</strong>
          </span>
          {summary.max_snow_in_hr > 0 && (
            <span className="flex items-center gap-1 text-cyan-300" title="Peak Snowfall Rate">
              <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
              <strong className="font-mono">{summary.max_snow_in_hr} in/h</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-sky-400 text-xs font-semibold">
          <span>{isSelected ? 'Viewing on map' : 'Inspect route'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
