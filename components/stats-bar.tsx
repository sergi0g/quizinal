"use client";

import { MASTERY_THRESHOLD, type Stats } from "@/lib/quiz";
import { twMerge } from "tailwind-merge";

function Tile({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number;
  dotClass: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 rounded-2xl bg-card px-2 py-2 text-center">
      <span className="text-lg font-extrabold tabular-nums leading-none">
        {value}
      </span>
      <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
        <span className={`size-2 rounded-full ${dotClass}`} aria-hidden />
        {label}
      </span>
    </div>
  );
}

export function StatsBar({
  stats,
  className,
}: {
  stats: Stats;
  className: string;
}) {
  const inProgressPct =
    stats.total > 0 ? (stats.working / stats.total) * 100 : 0; // Not an accurate calculation, it works for this situation though
  const masteredPct =
    stats.total > 0 ? (stats.mastered / stats.total) * 100 : 0;
  const totalPct = Math.round(inProgressPct / MASTERY_THRESHOLD + masteredPct);

  return (
    <div className={twMerge("flex flex-col gap-3", className)}>
      <div className="grid grid-cols-4 gap-2">
        <Tile label="Mastered" value={stats.mastered} dotClass="bg-success" />
        <Tile label="In Progress" value={stats.working} dotClass="bg-accent" />
        <Tile
          label="New"
          value={stats.unattempted}
          dotClass="bg-muted-foreground"
        />
        <Tile label="Total" value={stats.total} dotClass="bg-primary" />
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full flex relative"
          role="progressbar"
          aria-valuenow={totalPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Mastery progress"
        >
          <div style={{ width: `${masteredPct + inProgressPct}%` }}>
            <div className="absolute h-full rounded-full bg-muted w-full" />
            <div
              className="absolute -top-1 -left-1 box-content h-full rounded-full bg-accent transition-[width] duration-500 border-4 border-background"
              style={{ width: `${inProgressPct}%` }}
            />
            <div
              className="absolute -top-1 -left-1 box-content h-full rounded-full bg-success transition-[width] duration-500 border-4 border-background"
              style={{ width: `${masteredPct}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold tabular-nums text-muted-foreground">
          {totalPct}%
        </span>
      </div>
    </div>
  );
}
