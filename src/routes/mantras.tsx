import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useMantras } from "@/hooks/use-mantras";
import { Lotus } from "@/components/Lotus";
import { LotusRating } from "@/components/LotusRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import type { Mantra } from "@/lib/mantras";

export const Route = createFileRoute("/mantras")({
  head: () => ({
    meta: [
      { title: "Mantras — Stillness" },
      {
        name: "description",
        content: "A quiet library of mantras to return to.",
      },
    ],
  }),
  component: MantrasPage,
});

const PAGE_SIZE = 12;
const MAX_MANTRA_LENGTH = 500;

function MantrasPage() {
  const {
    mantras,
    isLoading,
    isSeeding,
    add,
    isAdding,
    update,
    isUpdating,
    remove,
    isRemoving,
    resetToDefaults,
    isResetting,
  } = useMantras();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Mantra | null>(null);
  const [deleting, setDeleting] = useState<Mantra | null>(null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);

  // mantras come pre-sorted from the server query + optimistic cache, but
  // re-slicing here keeps the page count honest as rows stream in.
  const visible = useMemo(
    () => mantras.slice(0, visibleCount),
    [mantras, visibleCount],
  );
  const hasMore = visible.length < mantras.length;

  const showLoading = isLoading || (mantras.length === 0 && isSeeding);

  return (
    <section className="space-y-4 animate-bloom">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <Lotus size={44} glow />
        </div>
        <h2 className="text-2xl font-semibold text-gold mb-1">Mantras</h2>
        <p className="text-sm text-muted-foreground italic">
          {mantras.length === 0
            ? "Your library is quiet. A first mantra soon."
            : mantras.length === 1
              ? "One phrase to return to"
              : `${mantras.length} phrases to return to - rank them with 1-5 lotus flowers.`}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          onClick={() => setAdding(true)}
          className="gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add mantra
        </Button>
        <Button
          variant="ghost"
          onClick={() => setResetting(true)}
          disabled={isResetting}
          className="text-muted-foreground hover:text-gold"
          title="Restore the default mantras"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          {isResetting ? "Restoring…" : "Reset"}
        </Button>
      </div>

      {showLoading ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 animate-pulse">
            <Lotus size={48} glow />
          </div>
          <p className="text-sm text-muted-foreground">
            {isSeeding ? "Planting your first mantras…" : "Gathering your library…"}
          </p>
        </div>
      ) : mantras.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 opacity-60">
            <Lotus size={64} />
          </div>
          <p className="text-muted-foreground">
            Your library is empty. Add a mantra to begin.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {visible.map((m) => (
              <li
                key={m.id}
                className="glass rounded-2xl p-5 shadow-soft flex gap-4 items-start hover:border-primary/30 transition-colors group"
              >
                <div className="shrink-0 mt-1">
                  <Lotus size={32} glow={m.rating !== null && m.rating >= 4} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground/90 leading-relaxed italic mb-3">
                    &quot;{m.text}&quot;
                  </p>
                  <LotusRating
                    value={m.rating}
                    size={16}
                    ariaLabel={`Rate: ${m.text}`}
                    onChange={async (next) => {
                      try {
                        await update({ id: m.id, patch: { rating: next } });
                      } catch (err) {
                        const msg =
                          err instanceof Error
                            ? err.message
                            : "Could not save rating.";
                        toast.error(msg);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-gold"
                    onClick={() => setEditing(m)}
                    title="Edit mantra"
                    aria-label="Edit mantra"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(m)}
                    title="Delete mantra"
                    aria-label="Delete mantra"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>

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

      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold text-xl">
              Add a mantra
            </DialogTitle>
          </DialogHeader>
          <MantraForm
            submitLabel="Add mantra"
            isSubmitting={isAdding}
            onCancel={() => setAdding(false)}
            onSubmit={async (values) => {
              try {
                await add(values);
                toast.success("Mantra added to your library.");
                setAdding(false);
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : "Could not add mantra.";
                toast.error(msg);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold text-xl">
              Edit mantra
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <MantraForm
              initialValues={{ text: editing.text, rating: editing.rating }}
              submitLabel="Save changes"
              cancelLabel="Cancel"
              isSubmitting={isUpdating}
              onCancel={() => setEditing(null)}
              onSubmit={async (values) => {
                try {
                  await update({ id: editing.id, patch: values });
                  toast.success("Mantra updated.");
                  setEditing(null);
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not update mantra.";
                  toast.error(msg);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={resetting}
        onOpenChange={(open) => !open && setResetting(false)}
      >
        <AlertDialogContent className="glass border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gold">
              Restore the default mantras?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your current library — including any you&apos;ve added or rated — will be
              replaced with the 10 starter mantras. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await resetToDefaults();
                  toast.success("Default mantras restored.");
                  setResetting(false);
                  setVisibleCount(PAGE_SIZE);
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not reset mantras.";
                  toast.error(msg);
                }
              }}
              disabled={isResetting}
              className="gradient-gold text-primary-foreground hover:opacity-90"
            >
              {isResetting ? "Restoring…" : "Restore defaults"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent className="glass border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gold">
              Release this mantra?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.text}" will be permanently removed from your library.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await remove(deleting.id);
                  toast.success("Mantra released.");
                  setDeleting(null);
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not delete mantra.";
                  toast.error(msg);
                }
              }}
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

type MantraFormValues = { text: string; rating: number | null };

function MantraForm({
  initialValues,
  submitLabel,
  cancelLabel,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  initialValues?: MantraFormValues;
  submitLabel: string;
  cancelLabel?: string;
  isSubmitting: boolean;
  onCancel?: () => void;
  onSubmit: (values: MantraFormValues) => Promise<void> | void;
}) {
  const [text, setText] = useState(initialValues?.text ?? "");
  const [rating, setRating] = useState<number | null>(
    initialValues?.rating ?? null,
  );
  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        void onSubmit({ text: trimmed, rating });
      }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <label
          htmlFor="mantra-text"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Mantra
        </label>
        <Textarea
          id="mantra-text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_MANTRA_LENGTH}
          placeholder="A phrase to return to…"
          className="min-h-[90px] resize-none"
        />
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Rating
        </span>
        <div className="flex items-center gap-3">
          <LotusRating
            value={rating}
            onChange={setRating}
            ariaLabel="Rate this mantra"
          />
          {rating !== null && (
            <button
              type="button"
              onClick={() => setRating(null)}
              className="text-xs text-muted-foreground hover:text-gold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {cancelLabel ?? "Cancel"}
          </Button>
        )}
        <Button
          type="submit"
          disabled={!canSubmit}
          className="gradient-gold text-primary-foreground hover:opacity-90"
        >
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
