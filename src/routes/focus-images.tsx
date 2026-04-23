import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Trash2, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useFocusImages } from "@/hooks/use-focus-images";
import { Lotus } from "@/components/Lotus";
import { FocusImageViewer } from "@/components/FocusImageViewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOCUS_TAGS,
  FOCUS_TAG_LABEL,
  type FocusImage,
  type FocusTag,
} from "@/lib/focus-images";

export const Route = createFileRoute("/focus-images")({
  head: () => ({
    meta: [
      { title: "Focus Image — Stillness" },
      { name: "description", content: "A quiet image to settle your gaze." },
    ],
  }),
  component: FocusImagesPage,
});

type TagFilter = FocusTag | "all";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

function FocusImagesPage() {
  const {
    images,
    isLoading,
    isSeeding,
    add,
    isAdding,
    remove,
    isRemoving,
    resetToDefaults,
    isResetting,
  } = useFocusImages();

  const [filter, setFilter] = useState<TagFilter>("all");
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState<FocusImage | null>(null);
  const [viewing, setViewing] = useState<FocusImage | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? images : images.filter((i) => i.tag === filter)),
    [images, filter],
  );

  const counts = useMemo(() => {
    const map: Record<TagFilter, number> = {
      all: images.length,
      nature: 0,
      mandalas: 0,
      candles: 0,
      spirals: 0,
      other: 0,
    };
    for (const i of images) map[i.tag]++;
    return map;
  }, [images]);

  const showLoading = isLoading || (images.length === 0 && isSeeding);

  return (
    <section className="space-y-5 animate-bloom">
      <div className="text-center mb-2">
        <div className="flex justify-center mb-3">
          <Lotus size={44} glow />
        </div>
        <h2 className="text-2xl font-semibold text-gold mb-1">Focus Image</h2>
        <p className="text-sm text-muted-foreground italic">
          {images.length === 0
            ? "Your gallery is quiet. A first image soon."
            : "Pick an image to settle your gaze. Tap to enter, Esc to release."}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        <Button
          onClick={() => setAdding(true)}
          className="gradient-gold text-primary-foreground hover:opacity-90 shadow-glow"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add image
        </Button>
        <Button
          variant="ghost"
          onClick={() => setResetting(true)}
          disabled={isResetting}
          className="text-muted-foreground hover:text-gold"
          title="Restore the default focus images"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          {isResetting ? "Restoring…" : "Reset"}
        </Button>
      </div>

      {/* Tag filter pills */}
      <div className="flex flex-wrap justify-center gap-1.5">
        <FilterPill
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="All"
          count={counts.all}
        />
        {FOCUS_TAGS.map((t) => (
          <FilterPill
            key={t}
            active={filter === t}
            onClick={() => setFilter(t)}
            label={FOCUS_TAG_LABEL[t]}
            count={counts[t]}
          />
        ))}
      </div>

      {showLoading ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 animate-pulse">
            <Lotus size={48} glow />
          </div>
          <p className="text-sm text-muted-foreground">
            {isSeeding ? "Gathering your gallery…" : "Loading focus images…"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center shadow-soft">
          <div className="flex justify-center mb-4 opacity-60">
            <Lotus size={64} />
          </div>
          <p className="text-muted-foreground">
            {filter === "all"
              ? "Your gallery is empty. Add an image to begin."
              : `No images tagged "${FOCUS_TAG_LABEL[filter as FocusTag]}" yet.`}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((image) => (
            <li key={image.id} className="relative group">
              <button
                type="button"
                onClick={() => setViewing(image)}
                className="block w-full aspect-square overflow-hidden rounded-2xl shadow-soft border border-border/40 hover:border-primary/50 transition-all hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Open focus image (${FOCUS_TAG_LABEL[image.tag]})`}
              >
                {image.url ? (
                  <img
                    src={image.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  // Optimistic placeholder while a file upload is in flight.
                  <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                    <Lotus size={32} glow />
                  </div>
                )}
              </button>

              <span className="pointer-events-none absolute bottom-2 left-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/55 text-white/85 backdrop-blur-sm">
                {FOCUS_TAG_LABEL[image.tag]}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(image);
                }}
                aria-label="Delete focus image"
                title="Delete"
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-destructive text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <FocusImageViewer
        src={viewing?.url ?? null}
        alt={viewing ? `Focus image (${FOCUS_TAG_LABEL[viewing.tag]})` : undefined}
        onClose={() => setViewing(null)}
      />

      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent className="glass border-border/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold text-xl">
              Add a focus image
            </DialogTitle>
          </DialogHeader>
          <AddImageForm
            isSubmitting={isAdding}
            onCancel={() => setAdding(false)}
            onSubmit={async (input) => {
              try {
                await add(input);
                toast.success("Image added.");
                setAdding(false);
              } catch (err) {
                const msg =
                  err instanceof Error ? err.message : "Could not add image.";
                toast.error(msg);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={resetting}
        onOpenChange={(open) => !open && setResetting(false)}
      >
        <AlertDialogContent className="glass border-border/60">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gold">
              Restore the default focus images?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your current gallery — including any images you&apos;ve added —
              will be replaced with the 10 starter images. Uploaded files will
              be deleted from storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await resetToDefaults();
                  toast.success("Default focus images restored.");
                  setResetting(false);
                  setFilter("all");
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not reset images.";
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
              Release this image?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This focus image will be permanently removed from your gallery
              {deleting?.storagePath ? " and its file deleted from storage." : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                try {
                  await remove(deleting);
                  toast.success("Image released.");
                  setDeleting(null);
                } catch (err) {
                  const msg =
                    err instanceof Error
                      ? err.message
                      : "Could not delete image.";
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

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
        active
          ? "gradient-gold text-primary-foreground shadow-glow"
          : "bg-foreground/5 text-muted-foreground hover:text-foreground hover:bg-foreground/10"
      }`}
    >
      {label}
      <span className={`ml-1.5 tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>
        {count}
      </span>
    </button>
  );
}

type AddImageInput =
  | { kind: "url"; url: string; tag: FocusTag }
  | { kind: "file"; file: File; tag: FocusTag };

function AddImageForm({
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (input: AddImageInput) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [tag, setTag] = useState<FocusTag>("other");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmedUrl = url.trim();
  const canSubmit =
    !isSubmitting &&
    ((mode === "upload" && !!file) || (mode === "url" && trimmedUrl.length > 0));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > MAX_UPLOAD_BYTES) {
      toast.error("Image is too large. Max 8 MB.");
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        if (mode === "upload" && file) {
          void onSubmit({ kind: "file", file, tag });
        } else if (mode === "url" && trimmedUrl) {
          void onSubmit({ kind: "url", url: trimmedUrl, tag });
        }
      }}
      className="space-y-5"
    >
      {/* Mode toggle */}
      <div className="flex rounded-md border border-border/60 p-1 bg-foreground/5">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex-1 text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
            mode === "upload"
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload file
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex-1 text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1.5 ${
            mode === "url"
              ? "bg-foreground/10 text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LinkIcon className="h-3.5 w-3.5" />
          From URL
        </button>
      </div>

      {mode === "upload" ? (
        <div className="space-y-2">
          <label
            htmlFor="focus-image-file"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Image file
          </label>
          <input
            ref={fileInputRef}
            id="focus-image-file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-foreground/10 file:text-foreground hover:file:bg-foreground/20 file:cursor-pointer cursor-pointer"
          />
          {file && (
            <p className="text-xs text-muted-foreground/80">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label
            htmlFor="focus-image-url"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Image URL
          </label>
          <Input
            id="focus-image-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="focus-image-tag"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          Tag
        </label>
        <Select value={tag} onValueChange={(v) => setTag(v as FocusTag)}>
          <SelectTrigger id="focus-image-tag">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-border/60">
            {FOCUS_TAGS.map((t) => (
              <SelectItem key={t} value={t}>
                {FOCUS_TAG_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="gradient-gold text-primary-foreground hover:opacity-90"
        >
          {isSubmitting ? "Adding…" : "Add image"}
        </Button>
      </div>
    </form>
  );
}
