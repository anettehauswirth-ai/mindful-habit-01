import { createFileRoute } from "@tanstack/react-router";
import { useSessions } from "@/hooks/use-sessions";
import { Lotus } from "@/components/Lotus";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Stillness" },
      { name: "description", content: "Your recent mindfulness sessions." },
    ],
  }),
  component: HistoryPage,
});

function truncate(text: string, n = 90) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function HistoryPage() {
  const { sessions } = useSessions();
  const recent = [...sessions]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 10);

  return (
    <section className="space-y-4 animate-bloom">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gold mb-1">Recent Sessions</h2>
        <p className="text-sm text-muted-foreground italic">
          The last 10 moments of stillness
        </p>
      </div>

      {recent.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 opacity-60">
            <Lotus size={64} />
          </div>
          <p className="text-muted-foreground">
            No sessions yet. Begin your practice today.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {recent.map((s) => (
            <li
              key={s.id}
              className="glass rounded-2xl p-5 shadow-soft flex gap-4 items-start hover:border-primary/30 transition-colors"
            >
              <div className="shrink-0 mt-1">
                <Lotus size={36} glow />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-gold font-medium">
                    {formatDate(s.date)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {s.durationMin} min
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    Presence
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={n}
                        className={`h-1.5 w-5 rounded-full ${
                          n <= s.presence ? "bg-gold" : "bg-foreground/10"
                        }`}
                        style={
                          n <= s.presence
                            ? { backgroundColor: "var(--gold)" }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
                {s.notes && (
                  <p className="text-sm text-muted-foreground/90 leading-relaxed italic">
                    "{truncate(s.notes)}"
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
