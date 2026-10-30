import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

export const MapLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-2 max-w-xs pointer-events-auto">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer text-slate-300 font-semibold uppercase tracking-wider text-[11px]"
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-sky-400" />
          <span>Map & Risk Legend</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
      </div>

      {isExpanded && (
        <div className="space-y-2.5 pt-1 text-[11px]">
          {/* Checkpoint Risk Levels */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Checkpoint Hazards</div>
            <div className="grid grid-cols-2 gap-1.5 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="text-slate-300">Low Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span className="text-slate-300">Moderate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0"></span>
                <span className="text-slate-300">High Risk</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 animate-pulse"></span>
                <span className="text-slate-300">Severe</span>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-900 border border-red-500 shrink-0"></span>
                <span className="text-red-300 font-bold">NO TRAVEL</span>
                <span className="text-[10px] text-slate-500">(≥55mph / Load rule)</span>
              </div>
            </div>
          </div>

          {/* Route Line Styles */}
          <div className="space-y-1 border-t border-slate-800/80 pt-2">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Route Paths</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 rounded bg-sky-400 shrink-0"></span>
                <span className="text-slate-200">Selected / Active Route</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 rounded bg-slate-500 dashed shrink-0"></span>
                <span className="text-slate-400">Alternative Options</span>
              </div>
            </div>
          </div>

          {/* Corridor Heatmap */}
          <div className="space-y-1 border-t border-slate-800/80 pt-2">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Corridor Heatmap Gradient</div>
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-red-600"></div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Low</span>
              <span>Moderate</span>
              <span>Severe</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
