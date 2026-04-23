import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { useSessions } from "@/hooks/use-sessions";
import { computeStreak } from "@/lib/sessions";
import { Lotus } from "@/components/Lotus";
import { SessionForm } from "@/components/SessionForm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Practice — Stillness" },
      { name: "description", content: "Log your daily mindfulness session." },
    ],
  }),
  component: LogSessionPage,
});

function LogSessionPage() {
  const { add, isAdding, sessions } = useSessions();
  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  return (
    <section className="glass rounded-3xl p-7 sm:p-10 shadow-soft animate-bloom">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Lotus size={52} glow />
        </div>
        <h2 className="text-[1.8125rem] font-semibold text-gold mb-1">
          Log a session
        </h2>
        {streak >= 2 && (
          <p className="text-sm text-muted-foreground/80 italic">
            {streak} days in a row
          </p>
        )}
      </div>

      <SessionForm
        submitLabel="Save Session"
        isSubmitting={isAdding}
        resetOnSubmit
        autoFocusDuration
        onSubmit={async (values) => {
          try {
            await add(values);
            toast.success("Session saved. A lotus blooms today. 🪷");
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Could not save session.";
            toast.error(msg);
          }
        }}
      />
    </section>
  );
}
