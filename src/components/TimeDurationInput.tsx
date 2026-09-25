import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, UserX, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';

export type TimeUnit = 'hours' | 'minutes' | 'seconds';

export interface TimeDurationValue {
  hours?: number;
  minutes?: number;
  seconds?: number;
  totalSeconds?: number;
}

interface TimeDurationInputProps {
  value?: any; // TimeDurationValue | 'A' | 'D'
  onChange: (val: any) => void;
  units?: TimeUnit[];
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
  if (value === 'A' || value === 'a') {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-red-50 border border-red-200 rounded-xl gap-2 text-center w-full">
        <div className="flex items-center gap-2 text-red-700 font-bold text-lg">
          <UserX className="w-5 h-5 text-red-600" />
          ABSENT (A)
        </div>
        <p className="text-xs text-red-500">Chrono non mesuré pour cause d'absence</p>
        <Button 
          type="button"
          size="sm" 
          variant="outline" 
          onClick={() => onChange({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })}
          className="mt-1 bg-white text-xs text-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Saisir un chrono
        </Button>
      </div>
    );
  }

  if (value === 'D' || value === 'd') {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-amber-50 border border-amber-200 rounded-xl gap-2 text-center w-full">
        <div className="flex items-center gap-2 text-amber-700 font-bold text-lg">
          <ShieldAlert className="w-5 h-5 text-amber-600" />
          DISPENSÉ (D)
        </div>
        <p className="text-xs text-amber-600">Élève dispensé médicalement</p>
        <Button 
          type="button"
          size="sm" 
          variant="outline" 
          onClick={() => onChange({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 })}
          className="mt-1 bg-white text-xs text-slate-700"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Saisir un chrono
        </Button>
      </div>
    );
  }

  const activeUnits = units && units.length > 0 ? units : ['minutes', 'seconds'];
  const hasHours = activeUnits.includes('hours');
  const hasMinutes = activeUnits.includes('minutes');
  const hasSeconds = activeUnits.includes('seconds');

  const [hours, setHours] = useState<number>(typeof value === 'object' && value ? value.hours || 0 : 0);
  const [minutes, setMinutes] = useState<number>(typeof value === 'object' && value ? value.minutes || 0 : 0);
  const [seconds, setSeconds] = useState<number>(typeof value === 'object' && value ? value.seconds || 0 : 0);

  // Sync internal state when external value changes
  useEffect(() => {
    if (typeof value === 'object' && value) {
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
              setHours(newHr);
            }
            setMinutes(newMin);
          }

          const total = (newHr * 3600) + (newMin * 60) + newSec;
          onChange({
            hours: newHr,
            minutes: newMin,
            seconds: newSec,
            totalSeconds: total
          });

          return newSec;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, minutes, hours, hasHours]);

  const updateParent = (h: number, m: number, s: number) => {
    const total = (h * 3600) + (m * 60) + s;
    onChange({
      hours: h,
      minutes: m,
      seconds: s,
      totalSeconds: total
    });
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim().toUpperCase();
    if (raw === 'A') { onChange('A'); return; }
    if (raw === 'D') { onChange('D'); return; }
    const num = raw === '' ? 0 : parseInt(raw, 10);
    if (!isNaN(num)) {
      const val = Math.max(0, num);
      setHours(val);
      updateParent(val, minutes, seconds);
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim().toUpperCase();
    if (raw === 'A') { onChange('A'); return; }
    if (raw === 'D') { onChange('D'); return; }
    const num = raw === '' ? 0 : parseInt(raw, 10);
    if (!isNaN(num)) {
      const val = Math.max(0, hasHours ? Math.min(59, num) : num);
      setMinutes(val);
      updateParent(hours, val, seconds);
    }
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim().toUpperCase();
    if (raw === 'A') { onChange('A'); return; }
    if (raw === 'D') { onChange('D'); return; }
    const num = raw === '' ? 0 : parseInt(raw, 10);
    if (!isNaN(num)) {
      const val = Math.max(0, (hasMinutes || hasHours) ? Math.min(59, num) : num);
      setSeconds(val);
      updateParent(hours, minutes, val);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    updateParent(0, 0, 0);
  };

  const totalSec = (hours * 3600) + (minutes * 60) + seconds;
  const targetSec = targetDurationSeconds;
  const percent = targetSec ? Math.round((totalSec / targetSec) * 100) : null;

  return (
    <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 w-full">
      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        {hasHours && (
          <div className="flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              min="0"
              value={hours || ''}
              onChange={handleHoursChange}
              placeholder="00"
              className="w-18 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-white touch-manipulation shadow-xs"
            />
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Heures (h)
            </span>
          </div>
        )}

        {hasHours && hasMinutes && (
          <div className="text-3xl sm:text-4xl font-bold text-slate-300 pb-4">:</div>
        )}

        {hasMinutes && (
          <div className="flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              min="0"
              max={hasHours ? 59 : undefined}
              value={minutes || ''}
              onChange={handleMinutesChange}
              placeholder="00"
              className="w-18 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-white touch-manipulation shadow-xs"
            />
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Minutes (min)
            </span>
          </div>
        )}

        {((hasHours || hasMinutes) && hasSeconds) && (
          <div className="text-3xl sm:text-4xl font-bold text-slate-300 pb-4">:</div>
        )}

        {hasSeconds && (
          <div className="flex flex-col items-center">
            <input
              type="text"
              inputMode="numeric"
              min="0"
              max={(hasMinutes || hasHours) ? 59 : undefined}
              value={seconds || ''}
              onChange={handleSecondsChange}
              placeholder="00"
              className="w-18 sm:w-20 h-14 sm:h-16 text-center text-3xl sm:text-4xl font-bold font-mono rounded-lg border-2 border-slate-200 focus:border-indigo-500 focus:outline-none bg-white touch-manipulation shadow-xs"
            />
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
              Secondes (s)
            </span>
          </div>
        )}
      </div>

      {/* Stopwatch Controls */}
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

      {/* Quick A and D buttons */}
      <div className="flex items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange('A')}
          className="text-xs font-bold px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
        >
          Absent (A)
        </button>
        <button
          type="button"
          onClick={() => onChange('D')}
          className="text-xs font-bold px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        >
          Dispensé (D)
        </button>
      </div>

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
  if (val === undefined || val === null || val === '') return '-';
  if (val === 'A' || val === 'a') return 'ABS (A)';
  if (val === 'D' || val === 'd') return 'DISP (D)';

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
