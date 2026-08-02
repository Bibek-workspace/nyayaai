'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { hearingApi } from '@/lib/api';
import { cn } from '@/lib/utils';

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulePage() {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const from = startOfMonth(cursor);
  const to = endOfMonth(cursor);

  const { data: hearings = [] } = useQuery({
    queryKey: ['hearings', cursor.toISOString().slice(0, 7)],
    queryFn: () => hearingApi.list({
      from: from.toISOString(),
      to: new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59).toISOString(),
    }),
  });

  // Build the 6×7 calendar grid
  const firstWeekday = from.getDay();
  const daysInMonth = to.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7) cells.push(null);

  function countOn(d: Date) {
    return hearings.filter((h) => sameDay(new Date(h.scheduled_at), d)).length;
  }

  const selectedHearings = selectedDate
    ? hearings.filter((h) => sameDay(new Date(h.scheduled_at), selectedDate))
    : [];

  const today = new Date();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        <div>
          <div className="text-xs font-mono tracking-widest text-gold/70 mb-2">CALENDAR</div>
          <h1 className="font-display text-4xl font-bold text-ivory">Hearing Schedule</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 nyaya-card p-5">
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCursor(addMonths(cursor, -1))} className="p-2 hover:bg-gold/10 rounded">
                <ChevronLeft size={18} className="text-gold" />
              </button>
              <div className="font-display text-2xl font-bold text-ivory">
                {cursor.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </div>
              <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-2 hover:bg-gold/10 rounded">
                <ChevronRight size={18} className="text-gold" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[10px] font-mono tracking-widest text-ivory/40 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <div key={i} />;
                const n = countOn(d);
                const isToday = sameDay(d, today);
                const isSelected = selectedDate && sameDay(d, selectedDate);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      'aspect-square rounded p-1.5 flex flex-col items-center justify-start transition-colors text-sm',
                      isSelected
                        ? 'bg-gold/20 border border-gold'
                        : isToday
                          ? 'border border-gold/40'
                          : 'hover:bg-navy/40 border border-transparent',
                    )}
                  >
                    <span className={cn('text-xs', isToday ? 'text-gold font-bold' : 'text-ivory/80')}>
                      {d.getDate()}
                    </span>
                    {n > 0 && (
                      <span className="mt-auto text-[9px] font-mono px-1 rounded bg-gold/20 text-gold">
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="nyaya-card p-5">
            <div className="text-xs font-mono tracking-widest text-gold mb-4">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()
                : 'SELECT A DATE'}
            </div>
            {!selectedDate ? (
              <div className="text-sm text-ivory/40 py-8 text-center">
                Click a date to see its hearings
              </div>
            ) : selectedHearings.length === 0 ? (
              <div className="text-sm text-ivory/40 py-8 text-center">
                No hearings on this day
              </div>
            ) : (
              <div className="space-y-3">
                {selectedHearings.map((h) => (
                  <Link
                    key={h.id}
                    href={`/cases/${h.case_id}`}
                    className="block p-3 rounded border border-gold/15 hover:border-gold/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono text-gold mb-1">
                      <Clock size={12} />
                      {new Date(h.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      <span className="text-ivory/40">· {h.duration_minutes} min</span>
                    </div>
                    <div className="text-sm text-ivory">{h.purpose}</div>
                    {h.courtroom && (
                      <div className="text-xs text-ivory/50 mt-1">📍 {h.courtroom}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
