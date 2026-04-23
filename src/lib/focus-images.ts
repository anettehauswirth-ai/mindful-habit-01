import type { Tables } from "@/integrations/supabase/types";

/** The fixed set of tags a focus image can have. Mirrors the DB CHECK. */
export const FOCUS_TAGS = [
  "nature",
  "mandalas",
  "candles",
  "spirals",
  "other",
] as const;

export type FocusTag = (typeof FOCUS_TAGS)[number];

/** Pretty label for a tag (used in filter pills and badges). */
export const FOCUS_TAG_LABEL: Record<FocusTag, string> = {
  nature: "Nature",
  mandalas: "Mandalas",
  candles: "Candles",
  spirals: "Spirals",
  other: "Other",
};

/**
 * A focus image as consumed by the UI. Field names mirror what the
 * components expect (camelCase).
 */
export type FocusImage = {
  id: string;
  url: string;
  /** Set only for user uploads — tells the hook to delete the file too. */
  storagePath: string | null;
  tag: FocusTag;
  createdAt: string;
};

/** Payload for creating a new focus image — id, user_id and timestamp are server-assigned. */
export type NewFocusImage = {
  url: string;
  storagePath?: string | null;
  tag: FocusTag;
};

/** Convert a Supabase `focus_images` row to the UI-facing shape. */
export function rowToFocusImage(row: Tables<"focus_images">): FocusImage {
  return {
    id: row.id,
    url: row.url,
    storagePath: row.storage_path,
    tag: row.tag,
    createdAt: row.created_at,
  };
}

/**
 * Preset focus images seeded into every user's library on first empty load.
 *
 * The image files live in `public/focus-presets/` so Vite serves them at
 * stable URLs (e.g. `/focus-presets/Nature1.png`) for any user of the app —
 * no external CDN or Supabase Storage upload required. Add a file to that
 * folder + a row here to introduce a new preset.
 */
export const PRESET_FOCUS_IMAGES: ReadonlyArray<{ url: string; tag: FocusTag }> = [
  { url: "/focus-presets/Nature1.png", tag: "nature" },
  { url: "/focus-presets/Nature2.png", tag: "nature" },
  { url: "/focus-presets/Nature3.png", tag: "nature" },
  { url: "/focus-presets/Mandala1.png", tag: "mandalas" },
  { url: "/focus-presets/Mandala2.png", tag: "mandalas" },
  { url: "/focus-presets/candle1.png", tag: "candles" },
  { url: "/focus-presets/candle2.png", tag: "candles" },
  { url: "/focus-presets/Spiral1.png", tag: "spirals" },
  { url: "/focus-presets/Spiral2.png", tag: "spirals" },
  { url: "/focus-presets/Other1.png", tag: "other" },
  { url: "/focus-presets/Other2.png", tag: "other" },
] as const;

/**
 * Sort: newest first. The DB index `(user_id, created_at desc)` keeps the
 * server query cheap; this is the same order applied to the optimistic
 * cache so adds appear at the top instantly.
 */
export function compareFocusImages(a: FocusImage, b: FocusImage): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

/** Best-effort extension extraction for upload object keys. */
export function fileExtension(file: File): string {
  const fromName = file.name.includes(".")
    ? file.name.split(".").pop()?.toLowerCase()
    : null;
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  // Fall back to mime subtype: `image/jpeg` -> `jpeg`.
  const fromMime = file.type.split("/")[1]?.toLowerCase();
  if (fromMime && /^[a-z0-9]{1,8}$/.test(fromMime)) return fromMime;
  return "bin";
}
