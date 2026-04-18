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

function CalendarPage() {
  const { sessions } = useSessions();

  const { points, max, totalDays } = useMemo(() => {
    const pastDays = 30;
    const futureDays = 2;
    const totalDays = pastDays + futureDays;
    const totals = new Map<string, number>();
    for (const s of sessions) {
      totals.set(s.date, (totals.get(s.date) ?? 0) + s.durationMin);
    }
    const points: { date: string; minutes: number; label: string }[] = [];
    const today = new Date();
    for (let i = pastDays - 1; i >= -futureDays; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      points.push({
        date: iso,
        minutes: totals.get(iso) ?? 0,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      });
    }
    const max = Math.max(1, ...points.map((p) => p.minutes)) + 2;
    return { points, max, totalDays };
  }, [sessions]);

  const streak = computeStreak(sessions);
  const today = todayISO();

  // Chart geometry
  const width = 800;
  const height = 280;
  const padX = 24;
  const padTop = 24;
  const padBottom = 36;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const stepX = innerW / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => {
    const x = padX + stepX * i;
    const y = padTop + innerH - (p.minutes / max) * innerH;
    return { ...p, x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    `M ${coords[0].x.toFixed(2)} ${(padTop + innerH).toFixed(2)} ` +
    coords.map((c) => `L ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(" ") +
    ` L ${coords[coords.length - 1].x.toFixed(2)} ${(padTop + innerH).toFixed(2)} Z`;

  // Y-axis ticks (4 lines)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    value: Math.round(max * t),
    y: padTop + innerH - t * innerH,
  }));

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

      <section className="glass rounded-3xl p-6 sm:p-8 shadow-soft">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-xl font-semibold text-gold">Last {totalDays} Days</h2>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Minutes meditated · peak {max}m
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[600px]"
            role="img"
            aria-label="Minutes meditated over the last 30 days"
          >
            <defs>
              <linearGradient id="bloomArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.82 0.12 85)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="oklch(0.82 0.12 85)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid + y labels */}
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
                  {t.value}
                </text>
              </g>
            ))}

            {/* X labels: every ~5 days */}
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

          {/* Lotus data points overlaid via absolute positioning for crisp images */}
          <div className="relative -mt-[280px] min-w-[600px] pointer-events-none" style={{ height }}>
            <div className="relative w-full h-full">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
                {coords.map((c, i) => {
                  const isToday = c.date === today;
                  const hasData = c.minutes > 0;
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
                        title={`${c.label}: ${c.minutes} min`}
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
    </div>
  );
}
