import React, { useState, useRef } from 'react';
import {
  MapPin,
  Scale,
  Sliders,
  Navigation,
  Loader2,
  AlertCircle,
  Clock,
  Search,
} from 'lucide-react';
import type { PlaceSuggestion } from '../types';
import { searchPlaces } from '../services/api';
import { getTruckWeightCategory } from '../utils/formatting';

interface RouteInputFormProps {
  onCalculate: (params: {
    origin: string;
    destination: string;
    departure_time: string;
    load_weight_lbs: number;
    sampling_miles: 10 | 25 | 50;
  }) => void;
  isLoading: boolean;
}

export const RouteInputForm: React.FC<RouteInputFormProps> = ({
  onCalculate,
  isLoading,
}) => {
  const [origin, setOrigin] = useState('Chicago, IL');
  const [destination, setDestination] = useState('Denver, CO');
  
  const getDefaultDateTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [departureTime, setDepartureTime] = useState(getDefaultDateTime());
  const [loadWeight, setLoadWeight] = useState<number>(42000);
  const [weightInputStr, setWeightInputStr] = useState<string>('42000');
  const [samplingMiles, setSamplingMiles] = useState<10 | 25 | 50>(25);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<PlaceSuggestion[]>([]);

  const originTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weightCategory = getTruckWeightCategory(loadWeight);

  const handleOriginChange = (val: string) => {
    setOrigin(val);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.origin;
      return copy;
    });

    if (originTimeoutRef.current) clearTimeout(originTimeoutRef.current);
    if (val.trim().length >= 2) {
      originTimeoutRef.current = setTimeout(async () => {
        const res = await searchPlaces(val);
        setOriginSuggestions(res);
      }, 300);
    } else {
      setOriginSuggestions([]);
    }
  };

  const handleDestChange = (val: string) => {
    setDestination(val);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.destination;
      return copy;
    });

    if (destTimeoutRef.current) clearTimeout(destTimeoutRef.current);
    if (val.trim().length >= 2) {
      destTimeoutRef.current = setTimeout(async () => {
        const res = await searchPlaces(val);
        setDestSuggestions(res);
      }, 300);
    } else {
      setDestSuggestions([]);
    }
  };

  const handleDepartureTimeChange = (val: string) => {
    setDepartureTime(val);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.departureTime;
      return copy;
    });
  };

  const handleWeightChange = (valStr: string) => {
    setWeightInputStr(valStr);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.loadWeight;
      return copy;
    });

    if (valStr.trim() === '') {
      return;
    }

    const num = parseInt(valStr, 10);
    if (!isNaN(num)) {
      setLoadWeight(num);
    }
  };

  const handleSliderChange = (num: number) => {
    setLoadWeight(num);
    setWeightInputStr(String(num));
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.loadWeight;
      return copy;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const cleanOrigin = origin.trim();
    const cleanDest = destination.trim();

    if (!cleanOrigin) {
      newErrors.origin = 'El origen de la ruta es obligatorio.';
    } else if (cleanOrigin.length < 2) {
      newErrors.origin = 'El origen debe tener al menos 2 caracteres.';
    }

    if (!cleanDest) {
      newErrors.destination = 'El destino de la ruta es obligatorio.';
    } else if (cleanDest.length < 2) {
      newErrors.destination = 'El destino debe tener al menos 2 caracteres.';
    }

    if (cleanOrigin && cleanDest && cleanOrigin.toLowerCase() === cleanDest.toLowerCase()) {
      newErrors.destination = 'El destino no puede ser igual al origen.';
    }

    if (!departureTime) {
      newErrors.departureTime = 'La fecha y hora de salida es obligatoria.';
    } else {
      const depDate = new Date(departureTime).getTime();
      const now = Date.now();
      if (isNaN(depDate)) {
        newErrors.departureTime = 'Fecha y hora de salida inválida.';
      } else if (depDate < now - 2 * 3600 * 1000) {
        newErrors.departureTime = 'La fecha de salida no puede ser anterior a la hora actual.';
      } else if (depDate > now + 14 * 24 * 3600 * 1000) {
        newErrors.departureTime = 'La salida debe estar dentro de los próximos 14 días (límite del pronóstico).';
      }
    }

    const weightNum = Number(loadWeight);
    if (weightInputStr.trim() === '' || isNaN(weightNum)) {
      newErrors.loadWeight = 'Ingresa el peso de la carga en libras.';
    } else if (weightNum < 0) {
      newErrors.loadWeight = 'El peso de carga no puede ser negativo.';
    } else if (weightNum > 90000) {
      newErrors.loadWeight = 'El peso máximo permitido es de 90,000 lbs (límite federal de transporte).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    let isoDate: string;
    try {
      isoDate = new Date(departureTime).toISOString();
    } catch {
      isoDate = new Date().toISOString();
    }

    onCalculate({
      origin: origin.trim(),
      destination: destination.trim(),
      departure_time: isoDate,
      load_weight_lbs: Number(loadWeight),
      sampling_miles: samplingMiles,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      {/* Main Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Origin & Destination Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Origin */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Origin City / Hub
            </label>
            <input
              type="text"
              value={origin}
              onChange={(e) => handleOriginChange(e.target.value)}
              placeholder="e.g. Chicago, IL or lat,lon"
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition ${
                errors.origin
                  ? 'border-red-500/80 bg-red-950/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
              }`}
            />
            {errors.origin && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.origin}
              </p>
            )}
            {originSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
                {originSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOrigin(s.name);
                      setOriginSuggestions([]);
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.origin;
                        return copy;
                      });
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 transition truncate"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              Destination City / Hub
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => handleDestChange(e.target.value)}
              placeholder="e.g. Denver, CO or lat,lon"
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition ${
                errors.destination
                  ? 'border-red-500/80 bg-red-950/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
              }`}
            />
            {errors.destination && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.destination}
              </p>
            )}
            {destSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
                {destSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDestination(s.name);
                      setDestSuggestions([]);
                      setErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.destination;
                        return copy;
                      });
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-800 transition truncate"
                  >
                    {s.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Departure Time & Sampling Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Departure Date/Time */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Departure Date & Time
            </label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => handleDepartureTimeChange(e.target.value)}
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2 text-sm text-white transition ${
                errors.departureTime
                  ? 'border-red-500/80 bg-red-950/20 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-700/80 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
              }`}
            />
            {errors.departureTime && (
              <p className="text-[11px] text-red-400 flex items-center gap-1 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.departureTime}
              </p>
            )}
          </div>

          {/* Sampling Interval (10 / 25 / 50 miles) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Weather Sampling Interval
              </span>
              <span className="text-[11px] text-slate-400">PDF requirement</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setSamplingMiles(step as 10 | 25 | 50)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                    samplingMiles === step
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                      : 'bg-slate-950 text-slate-300 border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  {step} miles
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Truck Load Weight & Rule Impact Indicator */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-400" />
              Truck Cargo Load Weight
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${weightCategory.badgeClass}`}>
                {weightCategory.label}
              </span>
              <span className="text-sm font-bold text-white font-mono">
                {new Intl.NumberFormat().format(loadWeight)} lbs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="80000"
              step="50"
              value={loadWeight}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="w-full accent-sky-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <input
              type="number"
              min="0"
              max="90000"
              step="1"
              value={weightInputStr}
              onChange={(e) => handleWeightChange(e.target.value)}
              className={`w-28 bg-slate-900 border rounded-lg px-2.5 py-1 text-xs text-white text-right font-mono transition ${
                errors.loadWeight
                  ? 'border-red-500/80 bg-red-950/30 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                  : 'border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
              }`}
              placeholder="lbs"
            />
          </div>

          {errors.loadWeight && (
            <p className="text-[11px] text-red-400 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.loadWeight}
            </p>
          )}

          <div className="flex items-start gap-2 text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Truck Load Risk Dynamics: </span>
              {weightCategory.loadRuleNotice}
            </div>
          </div>
        </div>

        {/* Validation Errors Notice */}
        {Object.keys(errors).length > 0 && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Por favor corrige los datos señalados en rojo antes de calcular las rutas.</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-sky-600 via-sky-500 to-cyan-500 hover:from-sky-500 hover:to-cyan-400 active:scale-[0.99] transition shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analizando Corredores y Evaluando Seguridad...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Buscar y Calcular 3 Rutas Seguras</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
