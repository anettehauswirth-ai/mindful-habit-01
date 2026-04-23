import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSessions } from "@/hooks/use-sessions";
import { computeStreak, todayISO } from "@/lib/sessions";
import { Lotus } from "@/components/Lotus";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Dashboard — Stillness" },
      { name: "description", content: "Your last 30 days of mindfulness in bloom." },
    ],
  }),
  component: CalendarPage,
});

type Point = { date: string; minutes: number; presence: number | null; label: string };

function CalendarPage() {
  const { sessions, isLoading } = useSessions();

  const { points, totalDays } = useMemo(() => {
    const pastDays = 30;
    // Charts show history only — we intentionally don't extend past today so
    // we don't render zero-minute "data points" or empty dots for days that
    // haven't happened yet.
    const futureDays = 0;
    const totalDays = pastDays + futureDays;
    const minutesByDay = new Map<string, number>();
    const presenceSum = new Map<string, number>();
    const presenceCount = new Map<string, number>();
    for (const s of sessions) {
      minutesByDay.set(s.date, (minutesByDay.get(s.date) ?? 0) + s.durationMin);
      presenceSum.set(s.date, (presenceSum.get(s.date) ?? 0) + s.presence);
      presenceCount.set(s.date, (presenceCount.get(s.date) ?? 0) + 1);
    }
    const points: Point[] = [];
    const today = new Date();
    for (let i = pastDays - 1; i >= -futureDays; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const count = presenceCount.get(iso) ?? 0;
      points.push({
        date: iso,
        minutes: minutesByDay.get(iso) ?? 0,
        presence: count > 0 ? (presenceSum.get(iso) ?? 0) / count : null,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
    return { points, totalDays };
  }, [sessions]);

  const streak = computeStreak(sessions);
  const today = todayISO();

  const minutesMax = Math.max(1, ...points.map((p) => p.minutes)) + 6;
  const peakMinutes = Math.max(0, ...points.map((p) => p.minutes));

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center animate-bloom">
        <div className="text-center">
          <div className="flex justify-center mb-4 animate-pulse">
            <Lotus size={56} glow />
          </div>
          <p className="text-sm text-muted-foreground">Gathering your practice…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-bloom">
      <section className="glass rounded-3xl p-8 shadow-soft text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Daily Completion Streak
        </p>
        <div className="flex items-center justify-center gap-4">
          <Lotus size={56} glow />
          <div className="text-6xl font-semibold text-gold tabular-nums">{streak}</div>
          <Lotus size={56} glow />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {streak === 0
            ? "Begin your bloom today."
            : streak === 1
            ? "day of presence"
            : "days of presence"}
        </p>
      </section>

      <BloomChart
        title={`Last ${totalDays} Days`}
        subtitle={`Minutes meditated · peak ${peakMinutes}m`}
        points={points}
        today={today}
        // 0 minutes = no session that day; surface it as "no data" so the
        // chart renders the muted placeholder dot instead of a lotus pinned
        // to the baseline (matches the focus chart's behavior).
        getValue={(p) => (p.minutes > 0 ? p.minutes : null)}
        max={minutesMax}
        formatTick={(v) => String(v)}
        ariaLabel="Minutes meditated over the last 30 days"
      />

      <BloomChart
        title="Focus Level"
        subtitle="Average presence · 1 – 5"
        points={points}
        today={today}
        getValue={(p) => p.presence}
        max={5}
        min={1}
        formatTick={(v) => v.toFixed(1)}
        ariaLabel="Average focus level over the last 30 days"
      />
    </div>
  );
}

function BloomChart({
  title,
  subtitle,
  points,
  today,
  getValue,
  max,
  min = 0,
  formatTick,
  ariaLabel,
}: {
  title: string;
  subtitle: string;
  points: Point[];
  today: string;
  getValue: (p: Point) => number | null;
  max: number;
  min?: number;
  formatTick: (v: number) => string;
  ariaLabel: string;
}) {
  const width = 800;
  const height = 280;
  const padX = 24;
  const padTop = 24;
  const padBottom = 36;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const stepX = innerW / Math.max(1, points.length - 1);
  const range = Math.max(0.0001, max - min);

  const coords = points.map((p, i) => {
    const v = getValue(p);
    const x = padX + stepX * i;
    const y = v == null ? padTop + innerH : padTop + innerH - ((v - min) / range) * innerH;
    return { ...p, value: v, x, y };
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: min + range * t,
    y: padTop + innerH - t * innerH,
  }));

  return (
    <section className="glass rounded-3xl p-6 sm:p-8 shadow-soft">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-xl font-semibold text-gold">{title}</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[600px]"
          role="img"
          aria-label={ariaLabel}
        >
          {ticks.map((t, i) => (
            <g key={i}>
              <line
                x1={padX}
                x2={width - padX}
                y1={t.y}
                y2={t.y}
                stroke="currentColor"
                className="text-muted-foreground/15"
                strokeDasharray="3 4"
              />
              <text
                x={padX - 6}
                y={t.y + 3}
                textAnchor="end"
                className="fill-muted-foreground/70"
                style={{ fontSize: 9 }}
              >
                {formatTick(t.value)}
              </text>
            </g>
          ))}

          {coords.map((c, i) =>
            i % 5 === 0 || i === coords.length - 1 ? (
              <text
                key={`xl-${i}`}
                x={c.x}
                y={height - 14}
                textAnchor="middle"
                className="fill-muted-foreground/70"
                style={{ fontSize: 9 }}
              >
                {c.label}
              </text>
            ) : null,
          )}
        </svg>

        <div className="relative -mt-[280px] min-w-[600px] pointer-events-none" style={{ height }}>
          <div className="relative w-full h-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
              {coords.map((c, i) => {
                const isToday = c.date === today;
                const hasData = c.value != null;
                const size = hasData ? (isToday ? 26 : 20) : 10;
                return (
                  <foreignObject
                    key={i}
                    x={c.x - size / 2}
                    y={c.y - size / 2}
                    width={size}
                    height={size}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center"
                      title={`${c.label}: ${hasData ? formatTick(c.value as number) : "—"}`}
                    >
                      {hasData ? (
                        <Lotus size={size} glow />
                      ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                  </foreignObject>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
