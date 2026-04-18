import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useSessions } from "@/hooks/use-sessions";
import { computeStreak, todayISO } from "@/lib/sessions";
import { Lotus } from "@/components/Lotus";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Bloom Calendar — Stillness" },
      { name: "description", content: "See your daily mindfulness streak bloom." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const { sessions } = useSessions();

  const { days, monthName, year, completedSet } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = first.getDay(); // 0 Sun
    const total = last.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    const completedSet = new Set(sessions.map((s) => s.date));
    return {
      days: cells,
      monthName: now.toLocaleDateString(undefined, { month: "long" }),
      year,
      completedSet,
    };
  }, [sessions]);

  const streak = computeStreak(sessions);
  const today = todayISO();
  const monthIdx = new Date().getMonth();
  const yearNow = new Date().getFullYear();

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="space-y-8 animate-bloom">
      <section className="glass rounded-3xl p-8 shadow-soft text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Daily Completion Streak
        </p>
        <div className="flex items-center justify-center gap-4">
          <Lotus size={56} glow />
          <div className="text-6xl font-semibold text-gold tabular-nums">
            {streak}
          </div>
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
        <h2 className="text-center text-xl font-semibold text-gold mb-6">
          {monthName} {year}
        </h2>

        <div className="grid grid-cols-7 gap-2 mb-3">
          {weekdays.map((w, i) => (
            <div
              key={i}
              className="text-center text-[10px] uppercase tracking-wider text-muted-foreground/70 py-1"
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            if (d === null) return <div key={i} />;
            const iso = `${yearNow}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const completed = completedSet.has(iso);
            const isToday = iso === today;
            return (
              <div
                key={i}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all ${
                  isToday
                    ? "bg-primary/10 ring-1 ring-primary/40"
                    : "bg-background/30"
                }`}
              >
                <span
                  className={`text-[10px] absolute top-1.5 left-2 ${
                    completed ? "text-gold" : "text-muted-foreground/60"
                  }`}
                >
                  {d}
                </span>
                {completed && (
                  <div className="animate-bloom">
                    <Lotus size={28} glow />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
