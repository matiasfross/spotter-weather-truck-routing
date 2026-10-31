import React from 'react';
import type { RouteOption } from '../types';
import { RouteCard } from './RouteCard';
import { Award } from 'lucide-react';

interface RouteComparisonProps {
  routes: RouteOption[];
  selectedRouteId: string;
  onSelectRoute: (id: string) => void;
  recommendationSummary: string;
  loadWeightLbs: number;
}

export const RouteComparison: React.FC<RouteComparisonProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  recommendationSummary,
  loadWeightLbs,
}) => {
  return (
    <div className="space-y-4">
      {/* Recommendation Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/60 border border-emerald-500/30 shadow-lg flex items-start gap-3.5">
        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5 border border-emerald-500/30">
          <Award className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
              Safety Recommendation Analysis
            </h4>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              Evaluated with {new Intl.NumberFormat().format(loadWeightLbs)} lb payload
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-sans">
            {recommendationSummary}
          </p>
        </div>
      </div>

      {/* Dynamic Route Cards Grid */}
      <div className={`grid grid-cols-1 ${
        routes.length === 1 ? 'md:grid-cols-1 max-w-xl mx-auto' :
        routes.length === 2 ? 'md:grid-cols-2' :
        'md:grid-cols-3'
      } gap-3`}>
        {routes.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRouteId === route.id}
            onSelect={() => onSelectRoute(route.id)}
          />
        ))}
      </div>
    </div>
  );
};
