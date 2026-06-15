"use client";

import { cn } from "@/lib/utils";
import { MONTHS, isToday, miniMonthGrid, startOfDay } from "./dates";

const MINI_WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function YearView({
  year,
  eventDays,
  onSelectDay,
  onSelectMonth,
}: {
  year: number;
  eventDays: Set<number>; // day-start timestamps that have at least one event
  onSelectDay: (day: Date) => void;
  onSelectMonth: (month: number) => void;
}) {
  return (
    <div className="grid h-full grid-cols-2 gap-6 overflow-y-auto p-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => (
        <div key={month}>
          <button
            onClick={() => onSelectMonth(month)}
            className="mb-1 text-sm font-semibold text-red-500 hover:underline"
          >
            {MONTHS[month]}
          </button>
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400">
            {MINI_WEEKDAYS.map((d) => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 text-center text-[11px]">
            {miniMonthGrid(year, month).map((day, i) => {
              if (!day) return <div key={i} />;
              const has = eventDays.has(startOfDay(day).getTime());
              return (
                <button
                  key={i}
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "relative mx-auto my-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-slate-100",
                    isToday(day) && "bg-red-500 font-semibold text-white hover:bg-red-500",
                  )}
                >
                  {day.getDate()}
                  {has && !isToday(day) && (
                    <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-slate-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
