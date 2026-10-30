import type { RiskLevel } from '../types';

export function formatWeight(lbs: number): string {
  return `${new Intl.NumberFormat().format(lbs)} lbs`;
}

export function formatDistance(miles: number): string {
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return '#10b981'; // emerald-500
    case 'MODERATE':
      return '#f59e0b'; // amber-500
    case 'HIGH':
      return '#f97316'; // orange-500
    case 'SEVERE':
      return '#ef4444'; // red-500
    case 'NO_TRAVEL':
      return '#7f1d1d'; // red-900 / dark maroon
    default:
      return '#64748b';
  }
}

export function getRiskBgClass(level: RiskLevel): string {
  switch (level) {
    case 'LOW':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'MODERATE':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'HIGH':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'SEVERE':
      return 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse';
    case 'NO_TRAVEL':
      return 'bg-red-950/80 text-red-200 border-red-600 font-bold';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

export function getTruckWeightCategory(weightLbs: number): {
  label: string;
  badgeClass: string;
  loadRuleNotice: string;
} {
  if (weightLbs > 40000) {
    return {
      label: 'Heavy Freight (>40k lbs)',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
      loadRuleNotice: 'Active rules: 35-44 mph wind escalates to Severe. ≥45 mph triggers No Travel.',
    };
  } else if (weightLbs > 30000) {
    return {
      label: 'Medium Heavy (30k-40k lbs)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      loadRuleNotice: 'Active rules: 45-54 mph wind escalates to No Travel. ≥55 mph No Travel.',
    };
  } else {
    return {
      label: 'Standard / Light (<30k lbs)',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      loadRuleNotice: 'Standard thresholds apply. Only winds ≥55 mph trigger No Travel.',
    };
  }
}
