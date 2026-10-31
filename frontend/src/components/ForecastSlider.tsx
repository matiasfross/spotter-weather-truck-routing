import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Flame,
  Wind,
  CloudRain,
  Snowflake,
  Layers
} from 'lucide-react';

export type HeatmapMetric = 'risk' | 'wind' | 'rain' | 'snow';

interface ForecastSliderProps {
  departureTimeIso: string;
  currentHourOffset: number;
  onHourChange: (hour: number) => void;
  activeMetric: HeatmapMetric;
  onMetricChange: (metric: HeatmapMetric) => void;
  isHeatmapVisible: boolean;
  onToggleHeatmap: () => void;
}

export const ForecastSlider: React.FC<ForecastSliderProps> = ({
  departureTimeIso,
  currentHourOffset,
  onHourChange,
  activeMetric,
  onMetricChange,
  isHeatmapVisible,
  onToggleHeatmap,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const playIntervalRef = useRef<any>(null);

  const getForecastDate = (offset: number) => {
    try {
      const base = new Date(departureTimeIso);
      base.setHours(base.getHours() + offset);
      return base.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return `+${offset} hours`;
    }
  };

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = playbackSpeed === 1 ? 500 : 250;
      playIntervalRef.current = setInterval(() => {
        onHourChange(currentHourOffset >= 48 ? 0 : currentHourOffset + 1);
      }, intervalMs);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, currentHourOffset, onHourChange]);

  const metrics: { id: HeatmapMetric; label: string; shortLabel: string; icon: any; color: string }[] = [
    { id: 'risk', label: 'Truck Risk', shortLabel: 'Risk', icon: Flame, color: 'text-red-400' },
    { id: 'wind', label: 'Wind Speed', shortLabel: 'Wind', icon: Wind, color: 'text-sky-400' },
    { id: 'rain', label: 'Precipitation', shortLabel: 'Rain', icon: CloudRain, color: 'text-blue-400' },
    { id: 'snow', label: 'Snowfall', shortLabel: 'Snow', icon: Snowflake, color: 'text-cyan-400' },
  ];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
      {/* Top Bar: Metric Selection & Heatmap Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleHeatmap}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
              isHeatmapVisible
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">Corridor Heatmap</span>
            <span className="inline xs:hidden sm:hidden">Heatmap</span>
            <span className={`w-2 h-2 rounded-full ${isHeatmapVisible ? 'bg-sky-400' : 'bg-slate-600'}`}></span>
          </button>

          {/* Metric Selector Pills - Always showing labels (short on mobile, full on desktop) */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto max-w-full">
            {metrics.map((m) => {
              const Icon = m.icon;
              const active = activeMetric === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onMetricChange(m.id)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0 ${
                    active
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? m.color : 'text-slate-500'}`} />
                  <span className="inline sm:hidden text-[11px] font-semibold">{m.shortLabel}</span>
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Time Display */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs text-slate-400">Projected:</span>
          <span className="text-xs font-bold text-white font-mono">
            {getForecastDate(currentHourOffset)}
          </span>
          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
            +{currentHourOffset}h
          </span>
        </div>
      </div>

      {/* Main Slider and Playback Controls */}
      <div className="flex items-center gap-4">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-xl font-bold text-white transition shadow-md flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20'
          }`}
          title={isPlaying ? 'Pause animation' : 'Play 48h weather radar forecast'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        {/* Speed toggle */}
        <button
          type="button"
          onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
          className="text-xs font-mono font-semibold px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
          title="Playback speed"
        >
          {playbackSpeed}x
        </button>

        {/* Reset to 0 */}
        <button
          type="button"
          onClick={() => {
            setIsPlaying(false);
            onHourChange(0);
          }}
          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Reset to departure hour"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* The 0-48h Slider */}
        <div className="flex-1 space-y-1">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="48"
              step="1"
              value={currentHourOffset}
              onChange={(e) => onHourChange(Number(e.target.value))}
              className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Hour Ticks */}
          <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5">
            <span>+0h (Depart)</span>
            <span>+12h</span>
            <span>+24h (Day 1)</span>
            <span>+36h</span>
            <span>+48h (Day 2)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
