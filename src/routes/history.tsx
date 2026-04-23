import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSessions } from "@/hooks/use-sessions";
import { Lotus } from "@/components/Lotus";
import { SessionForm } from "@/components/SessionForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Session } from "@/lib/sessions";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Stillness" },
      { name: "description", content: "Your recent mindfulness sessions." },
    ],
  }),
  component: HistoryPage,
});

const PAGE_SIZE = 10;
const NOTES_PREVIEW_LENGTH = 90;

function truncate(text: string, n = NOTES_PREVIEW_LENGTH) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n).trimEnd() + "…" : text;
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
  };
  // Only surface the year when it isn't the current year, to avoid noise on
  // recent sessions while keeping older ones unambiguous.
  if (y !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return dt.toLocaleDateString(undefined, options);
}

/** Format a YYYY-MM bucket key as a human month ("April 2026" / "April"). */
function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const dt = new Date(y, m - 1, 1);
  const options: Intl.DateTimeFormatOptions = { month: "long" };
  if (y !== new Date().getFullYear()) {
    options.year = "numeric";
  }
  return dt.toLocaleDateString(undefined, options);
}

/**
 * Collapse a pre-sorted list of sessions into contiguous month buckets.
 * Caller must sort by date desc first so same-month rows land together.
 */
function groupByMonth(
  sessions: Session[],
): Array<{ month: string; sessions: Session[] }> {
  const groups: Array<{ month: string; sessions: Session[] }> = [];
  for (const s of sessions) {
    const month = s.date.slice(0, 7); // YYYY-MM
    const tail = groups[groups.length - 1];
    if (tail && tail.month === month) {
      tail.sessions.push(s);
    } else {
      groups.push({ month, sessions: [s] });
    }
  }
  return groups;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function SessionNotes({
  notes,
  expanded,
  onToggle,
}: {
  notes: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!notes) return null;
  const isLong = notes.length > NOTES_PREVIEW_LENGTH;
  const shown = isLong && !expanded ? truncate(notes) : notes;
  return (
    <div>
      <p className="text-sm text-muted-foreground/90 leading-relaxed italic">
        &quot;{shown}&quot;
      </p>
      {isLong && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-xs text-gold/70 hover:text-gold not-italic"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function HistoryPage() {
  const { sessions, isLoading, update, isUpdating, remove, isRemoving } =
    useSessions();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<Session | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const sorted = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        // Practice date first, then most-recently-logged as a tiebreak. Tri-state
        // so equal keys preserve input order (V8's sort is stable) instead of
        // getting flipped, and groups stay contiguous for month dividers.
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        if (a.createdAt !== b.createdAt)
          return a.createdAt < b.createdAt ? 1 : -1;
        return 0;
      }),
    [sessions],
  );
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visible.length < sorted.length;
  const groups = useMemo(() => groupByMonth(visible), [visible]);
  const showMonthHeaders = groups.length > 1;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      toast.success("Session released.");
      setDeleting(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not delete session.";
      toast.error(msg);
    }
  };

  return (
    <section className="space-y-4 animate-bloom">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gold mb-1">
          Recent Sessions
        </h2>
        <p className="text-sm text-muted-foreground italic">
          {sorted.length === 0
            ? "A quiet page, ready for your first breath"
            : sorted.length === 1
              ? "One moment of stillness so far"
              : `${sorted.length} moments of stillness`}
        </p>
      </div>

      {isLoading ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 animate-pulse">
            <Lotus size={48} glow />
          </div>
          <p className="text-sm text-muted-foreground">
            Gathering your practice…
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 opacity-60">
            <Lotus size={64} />
          </div>
          <p className="text-muted-foreground">
            No sessions yet. Begin your practice today.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.month} className="space-y-3">
                {showMonthHeaders && (
                  <h3 className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/60 px-1">
                    {formatMonth(group.month)}
                  </h3>
                )}
                <ul className="space-y-3">
                  {group.sessions.map((s) => (
                    <li
                      key={s.id}
                      className="glass rounded-2xl p-5 shadow-soft flex gap-4 items-start hover:border-primary/30 transition-colors group"
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
                                  n <= s.presence
                                    ? "bg-gold"
                                    : "bg-foreground/10"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <SessionNotes
                          notes={s.notes}
                          expanded={expandedIds.has(s.id)}
                          onToggle={() => toggleExpanded(s.id)}
                        />
                      </div>
                      <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-gold"
                          onClick={() => setEditing(s)}
                          title="Edit session"
                          aria-label="Edit session"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleting(s)}
                          title="Delete session"
                          aria-label="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-muted-foreground hover:text-gold"
              >
                Show more
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold text-xl">
              Edit session
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <SessionForm
              initialValues={{
                date: parseLocalDate(editing.date),
                durationMin: editing.durationMin,
                presence: editing.presence,
                notes: editing.notes,
              }}
              submitLabel="Save changes"
              cancelLabel="Cancel"
              isSubmitting={isUpdating}
              onCancel={() => setEditing(null)}
              onSubmit={async (values) => {
                try {
                  await update({ id: editing.id, patch: values });
                  toast.success("Session updated.");
                  setEditing(null);
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not update session.";
                  toast.error(msg);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent className="glass border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gold">
              Release this session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `${formatDate(deleting.date)} · ${deleting.durationMin} min will be permanently removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Releasing…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
