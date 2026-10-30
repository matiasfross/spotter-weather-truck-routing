import React from 'react';
import type { RiskLevel } from '../types';
import { getRiskBgClass } from '../utils/formatting';
import { ShieldAlert, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  label,
  size = 'md',
  showIcon = true,
}) => {
  const displayLabel = label || level.replace('_', ' ');

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  const getIcon = () => {
    switch (level) {
      case 'NO_TRAVEL':
        return <Flame className="w-3.5 h-3.5 text-red-300 animate-bounce" />;
      case 'SEVERE':
        return <ShieldAlert className="w-3.5 h-3.5 text-red-400" />;
      case 'HIGH':
        return <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      case 'MODERATE':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'LOW':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide uppercase ${getRiskBgClass(
        level
      )} ${sizeClasses}`}
    >
      {showIcon && getIcon()}
      {displayLabel}
    </span>
  );
};
