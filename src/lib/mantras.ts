import type { Tables } from "@/integrations/supabase/types";

/**
 * A mantra as consumed by the UI. Field names mirror what the components
 * expect (camelCase). `rating` is null when the user hasn't rated it yet.
 */
export type Mantra = {
  id: string;
  text: string;
  rating: number | null; // 1-5 or null for unrated
  createdAt: string;
};

/** Payload for creating a new mantra — id, user_id and timestamps are server-assigned. */
export type NewMantra = {
  text: string;
  rating: number | null;
};

/** Convert a Supabase `mantras` row to the UI-facing `Mantra` shape. */
export function rowToMantra(row: Tables<"mantras">): Mantra {
  return {
    id: row.id,
    text: row.text,
    rating: row.rating,
    createdAt: row.created_at,
  };
}

/**
 * The preset mantras seeded into a user's library the first time they land
 * on the Mantras page with an empty list. Users own the seeded rows and can
 * edit, rate, or delete them like any other mantra.
 */
export const PRESET_MANTRAS: readonly string[] = [
  "I am bliss.",
  "This moment is perfect.",
  "Recharge, renew.",
  "I am available for energy and creativity.",
  "My nature is to flow.",
  "I am grateful for…",
  "What is true for me today?",
  "My intent is heard by universal intelligence.",
  "My true nature is spirit.",
  "My true happiness is sourced from within.",
] as const;

/**
 * Sort order for mantras: rating descending (5 first), null ratings last,
 * then alphabetically by text. Matches the server-side index order and is
 * used when we optimistically mutate the cache so the UI stays consistent.
 */
export function compareMantras(a: Mantra, b: Mantra): number {
  const ar = a.rating;
  const br = b.rating;
  if (ar !== br) {
    // null sorts last
    if (ar === null) return 1;
    if (br === null) return -1;
    // higher rating first
    return br - ar;
  }
  // alphabetical, case-insensitive, locale-aware
  return a.text.localeCompare(b.text, undefined, { sensitivity: "base" });
}
