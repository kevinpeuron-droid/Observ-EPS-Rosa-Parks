import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from './ui/Button';

export type TimeUnit = 'hours' | 'minutes' | 'seconds';

export interface TimeDurationValue {
  hours?: number;
  minutes?: number;
  seconds?: number;
  totalSeconds?: number;
}

interface TimeDurationInputProps {
  value?: TimeDurationValue;
  onChange: (val: TimeDurationValue) => void;
  units?: TimeUnit[]; // Default ['minutes', 'seconds'] or user configured
  targetDurationSeconds?: number;
  withStopwatch?: boolean;
}

export function TimeDurationInput({
  value,
  onChange,
  units = ['hours', 'minutes', 'seconds'],
  targetDurationSeconds,
  withStopwatch = true
}: TimeDurationInputProps) {
  const activeUnits = units && units.length > 0 ? units : ['minutes', 'seconds'];
  const hasHours = activeUnits.includes('hours');
  const hasMinutes = activeUnits.includes('minutes');
  const hasSeconds = activeUnits.includes('seconds');

  const [hours, setHours] = useState<number>(value?.hours || 0);
  const [minutes, setMinutes] = useState<number>(value?.minutes || 0);
  const [seconds, setSeconds] = useState<number>(value?.seconds || 0);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      setHours(value.hours || 0);
      setMinutes(value.minutes || 0);
      setSeconds(value.seconds || 0);
    }
  }, [value?.hours, value?.minutes, value?.seconds]);

  // Stopwatch state
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prevSec => {
          let newSec = prevSec + 1;
          let newMin = minutes;
          let newHr = hours;

          if (newSec >= 60) {
            newSec = 0;
            newMin += 1;
            if (newMin >= 60 && hasHours) {
              newMin = 0;
              newHr += 1;
            }
          }
          setMinutes(newMin);
          setHours(newHr);
          emitChange(newHr, newMin, newSec);
          return newSec;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, minutes, hours, hasHours]);

  const emitChange = (h: number, m: number, s: number) => {
    const totalSec = (hasHours ? h * 3600 : 0) + (hasMinutes ? m * 60 : 0) + (hasSeconds ? s : 0);
    onChange({
      hours: hasHours ? h : 0,
      minutes: hasMinutes ? m : 0,
      seconds: hasSeconds ? s : 0,
      totalSeconds: totalSec
    });
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
    setHours(val);
    emitChange(val, minutes, seconds);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
    const maxVal = hasHours ? 59 : 999;
    const val = Math.max(0, Math.min(maxVal, raw));
    setMinutes(val);
    emitChange(hours, val, seconds);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
    const maxVal = (hasHours || hasMinutes) ? 59 : 9999;
    const val = Math.max(0, Math.min(maxVal, raw));
    setSeconds(val);
    emitChange(hours, minutes, val);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    emitChange(0, 0, 0);
  };

  const totalSec = (hasHours ? hours * 3600 : 0) + (hasMinutes ? minutes * 60 : 0) + (hasSeconds ? seconds : 0);
  const targetSec = targetDurationSeconds;
  const percent = (targetSec && targetSec > 0 && totalSec > 0) ? Math.round((totalSec / targetSec) * 100) : null;

  return (
    <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
      {/* Inputs for configured units */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
        {hasHours && (
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              value={hours || ''}
              onChange={handleHoursChange}
              placeholder="00"
              className="w-20 sm:w-24 h-16 text-center text-3xl sm:text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-white touch-manipulation"
            />
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Heures</span>
          </div>
        )}

        {hasHours && (hasMinutes || hasSeconds) && (
          <div className="text-3xl sm:text-4xl font-bold text-slate-300 pb-6">:</div>
        )}

        {hasMinutes && (
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max={hasHours ? 59 : undefined}
              value={minutes || ''}
              onChange={handleMinutesChange}
              placeholder="00"
              className="w-20 sm:w-24 h-16 text-center text-3xl sm:text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-white touch-manipulation"
            />
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Minutes</span>
          </div>
        )}

        {hasMinutes && hasSeconds && (
          <div className="text-3xl sm:text-4xl font-bold text-slate-300 pb-6">:</div>
        )}

        {hasSeconds && (
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max={(hasHours || hasMinutes) ? 59 : undefined}
              value={seconds || ''}
              onChange={handleSecondsChange}
              placeholder="00"
              className="w-20 sm:w-24 h-16 text-center text-3xl sm:text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-white touch-manipulation"
            />
            <span className="text-[11px] sm:text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">Secondes</span>
          </div>
        )}
      </div>

      {/* Optional Integrated Chrono Controls for quick recording */}
      {withStopwatch && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/80 w-full justify-center">
          <Button
            type="button"
            size="sm"
            variant={isRunning ? 'danger' : 'primary'}
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Chrono
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Lancer Chrono
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={resetTimer}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Remise à 0
          </Button>
        </div>
      )}

      {/* Target comparison if configured */}
      {percent !== null && totalSec > 0 && (
        <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-bold w-full text-center text-sm sm:text-base mt-1">
          Temps effectif : {percent}% de la cible ({Math.floor(targetSec! / 60)}m {targetSec! % 60}s)
        </div>
      )}
    </div>
  );
}

export function formatTimeDuration(
  val: any,
  units?: TimeUnit[]
): string {
  if (!val) return '-';

  // Support numeric seconds or object
  if (typeof val === 'number') {
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    const s = val % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s.toString().padStart(2, '0')}s`);
    return parts.join(' ');
  }

  const h = val.hours || 0;
  const m = val.minutes || 0;
  const s = val.seconds || 0;

  const parts: string[] = [];
  if (units?.includes('hours') || h > 0) {
    parts.push(`${h}h`);
  }
  if (units?.includes('minutes') || m > 0 || h > 0) {
    parts.push(`${m}m`);
  }
  if (units?.includes('seconds') || s > 0 || parts.length === 0) {
    parts.push(`${s.toString().padStart(2, '0')}s`);
  }

  return parts.join(' ');
}
