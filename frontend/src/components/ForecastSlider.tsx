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
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const playIntervalRef = useRef<any>(null);

  const getForecastDate = (offset: number) => {
    try {
      const base = new Date(departureTimeIso);
      const totalMinutes = Math.round(offset * 60);
      base.setMinutes(base.getMinutes() + totalMinutes);
      return base.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      const hrs = Math.floor(offset);
      const mins = Math.round((offset - hrs) * 60);
      return mins > 0 ? `+${hrs}h ${mins}m` : `+${hrs}h`;
    }
  };

  const formatHourOffsetBadge = (offset: number) => {
    const hrs = Math.floor(offset);
    const mins = Math.round((offset - hrs) * 60);
    return mins > 0 ? `+${hrs}h ${mins}m` : `+${hrs}h`;
  };

  useEffect(() => {
    if (isPlaying) {
      // 0.25h increments: at 1x speed: 120ms per step (~2h / sec)
      // at 2x: 60ms per step (~4h / sec)
      // at 4x: 30ms per step (~8h / sec)
      const intervalMs = playbackSpeed === 1 ? 120 : playbackSpeed === 2 ? 60 : 30;
      playIntervalRef.current = setInterval(() => {
        const next = Math.round((currentHourOffset + 0.25) * 100) / 100;
        onHourChange(next > 48 ? 0 : next);
      }, intervalMs);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, playbackSpeed, currentHourOffset, onHourChange]);

  const metrics: {
    id: HeatmapMetric;
    label: string;
    shortLabel: string;
    icon: any;
    color: string;
    activeBg: string;
  }[] = [
    {
      id: 'risk',
      label: 'Truck Risk',
      shortLabel: 'Risk',
      icon: Flame,
      color: 'text-red-400',
      activeBg: 'bg-red-950/70 text-red-100 border-red-500/60 shadow-red-950/50',
    },
    {
      id: 'wind',
      label: 'Wind Speed',
      shortLabel: 'Wind',
      icon: Wind,
      color: 'text-sky-400',
      activeBg: 'bg-sky-950/70 text-sky-100 border-sky-500/60 shadow-sky-950/50',
    },
    {
      id: 'rain',
      label: 'Precipitation',
      shortLabel: 'Rain',
      icon: CloudRain,
      color: 'text-blue-400',
      activeBg: 'bg-blue-950/70 text-blue-100 border-blue-500/60 shadow-blue-950/50',
    },
    {
      id: 'snow',
      label: 'Snowfall',
      shortLabel: 'Snow',
      icon: Snowflake,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-950/70 text-cyan-100 border-cyan-500/60 shadow-cyan-950/50',
    },
  ];

  const handleMetricClick = (metricId: HeatmapMetric) => {
    onMetricChange(metricId);
    if (!isHeatmapVisible) {
      onToggleHeatmap();
    }
  };

  const handleSpeedCycle = () => {
    setPlaybackSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1));
  };

  const hourTicks = [
    { offset: 0, label: '+0h (Depart)' },
    { offset: 12, label: '+12h' },
    { offset: 24, label: '+24h (Day 1)' },
    { offset: 36, label: '+36h' },
    { offset: 48, label: '+48h (Day 2)' },
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

          {/* Metric Selector Pills - With semantic color contrast */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto max-w-full">
            {metrics.map((m) => {
              const Icon = m.icon;
              const active = activeMetric === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleMetricClick(m.id)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 sm:gap-1.5 border transition cursor-pointer shrink-0 ${
                    active
                      ? `${m.activeBg} font-semibold shadow-sm`
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                  title={`View ${m.label} heatmap across the corridor`}
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
            {formatHourOffsetBadge(currentHourOffset)}
          </span>
        </div>
      </div>

      {/* Main Slider and Playback Controls */}
      <div className="flex items-center gap-4">
        {/* Play / Pause button */}
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2.5 rounded-xl font-bold text-white transition shadow-md flex items-center justify-center cursor-pointer ${
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
          onClick={handleSpeedCycle}
          className="text-xs font-mono font-semibold px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          title="Playback speed (1x / 2x / 4x)"
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
          className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Reset to departure hour"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* The 0-48h Slider with High-Contrast Dual-Layer Track (No White Bar) */}
        <div className="flex-1 space-y-1">
          <div className="relative flex items-center h-6">
            {/* Dark base track and colored progress fill */}
            <div className="absolute inset-x-0 h-2 bg-slate-800 rounded-full border border-slate-700/60 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                style={{ width: `${(currentHourOffset / 48) * 100}%` }}
              />
            </div>
            {/* Transparent input with custom thumb */}
            <input
              type="range"
              min="0"
              max="48"
              step="0.25"
              value={currentHourOffset}
              onChange={(e) => onHourChange(parseFloat(e.target.value))}
              className="custom-range-slider relative z-10 w-full"
            />
          </div>

          {/* Interactive Hour Ticks */}
          <div className="flex justify-between text-[10px] font-mono px-0.5">
            {hourTicks.map((tick) => (
              <button
                key={tick.offset}
                type="button"
                onClick={() => onHourChange(tick.offset)}
                className={`cursor-pointer transition hover:text-sky-300 ${
                  currentHourOffset === tick.offset
                    ? 'text-sky-400 font-bold underline underline-offset-2'
                    : 'text-slate-500 hover:underline'
                }`}
                title={`Jump to +${tick.offset}h`}
              >
                {tick.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
