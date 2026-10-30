import React from 'react';
import { X, ShieldAlert, Scale, ArrowRight } from 'lucide-react';

interface RiskRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RiskRulesModal: React.FC<RiskRulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Weather Risk & Load Weight Rules</h2>
              <p className="text-xs text-slate-400">Specification reference standards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Weather Thresholds Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              Checkpoint Weather Classification Thresholds
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-300">
                    <th className="py-2.5 px-4 font-semibold">Condition</th>
                    <th className="py-2.5 px-4 font-semibold text-emerald-400">Low</th>
                    <th className="py-2.5 px-4 font-semibold text-amber-400">Moderate</th>
                    <th className="py-2.5 px-4 font-semibold text-orange-400">High</th>
                    <th className="py-2.5 px-4 font-semibold text-red-400">Severe</th>
                    <th className="py-2.5 px-4 font-semibold text-red-600">No Travel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 font-medium font-sans text-white">Wind (mph)</td>
                    <td className="py-2.5 px-4">&lt; 25</td>
                    <td className="py-2.5 px-4">25–34</td>
                    <td className="py-2.5 px-4">35–44</td>
                    <td className="py-2.5 px-4">45–54</td>
                    <td className="py-2.5 px-4 font-bold text-red-400">≥ 55 mph</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium font-sans text-white">Rain (in/hr)</td>
                    <td className="py-2.5 px-4">&lt; 0.10</td>
                    <td className="py-2.5 px-4">0.10–0.25</td>
                    <td className="py-2.5 px-4">0.25–0.50</td>
                    <td className="py-2.5 px-4">0.50–1.00</td>
                    <td className="py-2.5 px-4 font-bold text-red-400">&gt; 1.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium font-sans text-white">Snow (in/hr)</td>
                    <td className="py-2.5 px-4">&lt; 0.5</td>
                    <td className="py-2.5 px-4">0.5–1.0</td>
                    <td className="py-2.5 px-4">1.0–2.0</td>
                    <td className="py-2.5 px-4">2.0–3.0</td>
                    <td className="py-2.5 px-4 font-bold text-red-400">&gt; 3.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Load Rules */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Load Rules (Wind & Truck Weight Modifiers)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-red-900/40 bg-red-950/20">
                <div className="font-semibold text-red-300 mb-1">≥ 55 mph Wind</div>
                <div className="text-xs text-red-200/80">
                  <span className="font-bold text-red-400">NO TRAVEL</span> for any load weight. Absolute safety threshold.
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-amber-900/40 bg-amber-950/20">
                <div className="font-semibold text-amber-300 mb-1">45–54 mph + &gt; 30,000 lb</div>
                <div className="text-xs text-amber-200/80">
                  Escalates from Severe to <span className="font-bold text-red-400">NO TRAVEL</span> due to high rollover risk.
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-orange-900/40 bg-orange-950/20">
                <div className="font-semibold text-orange-300 mb-1">35–44 mph + &gt; 40,000 lb</div>
                <div className="text-xs text-orange-200/80">
                  Escalates from High to <span className="font-bold text-red-400">SEVERE</span> due to extreme crosswind lateral force.
                </div>
              </div>
            </div>
          </div>

          {/* Route Recommendation Hierarchy */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-sky-400" />
              Route Recommendation Preference Hierarchy
            </h3>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">1</span>
                <span className="font-medium text-slate-200">Fewest Severe miles</span>
                <span className="text-slate-400">(Includes No-Travel conditions to guarantee maximum driver safety)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">2</span>
                <span className="font-medium text-slate-200">Fewest High miles</span>
                <span className="text-slate-400">(Minimizes secondary elevated weather hazards)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">3</span>
                <span className="font-medium text-slate-200">Lowest average risk</span>
                <span className="text-slate-400">(Distance-weighted average risk score along route checkpoints)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">4</span>
                <span className="font-medium text-slate-200">Shortest travel times</span>
                <span className="text-slate-400">(Duration tie-breaker when risk metrics are identical)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
