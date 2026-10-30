import React from 'react';
import { Truck, CloudLightning, ShieldAlert } from 'lucide-react';

interface NavbarProps {
  onOpenRules: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenRules }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">spotter</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                Truck Routing
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5">
              Weather-Aware Safety & Load Risk Optimization Engine
            </p>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <CloudLightning className="w-3.5 h-3.5 text-sky-400" />
            <span>Open-Meteo Live Forecast</span>
          </div>

          <button
            onClick={onOpenRules}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Risk Rules Reference</span>
            <span className="sm:hidden">Rules</span>
          </button>
        </div>
      </div>
    </header>
  );
};
