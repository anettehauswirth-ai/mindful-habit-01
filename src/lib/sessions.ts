import type { Tables } from "@/integrations/supabase/types";

/**
 * A mindfulness session as consumed by the UI.
 * Field names mirror what the existing components expect (camelCase).
 */
export type Session = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  createdAt: string;
  durationMin: number;
  presence: number; // 1-5
  notes: string;
};

/** Payload for creating a new session — id, user_id and timestamps are server-assigned. */
export type NewSession = {
  date: string;
  durationMin: number;
  presence: number;
  notes: string;
};

/** Legacy localStorage key — kept so we can migrate existing data to Supabase once. */
export const LEGACY_STORAGE_KEY = "mindfulness.sessions.v1";

/** Convert a Supabase `sessions` row to the UI-facing `Session` shape. */
export function rowToSession(row: Tables<"sessions">): Session {
  return {
    id: row.id,
    date: row.date,
    createdAt: row.created_at,
    durationMin: Number(row.duration_min),
    presence: row.presence,
    notes: row.notes ?? "",
  };
}

/** Format a Date as an ISO yyyy-mm-dd string in the user's local time zone. */
export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Count the current run of consecutive days with at least one session,
 * anchored on today (or yesterday if today isn't logged yet).
 */
export function computeStreak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const cur = new Date();
  // If today not present, streak can still count from yesterday.
  if (!days.has(todayISO(cur))) {
    cur.setDate(cur.getDate() - 1);
  }
  while (days.has(todayISO(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

/**
 * Read any sessions previously saved to localStorage so they can be migrated
 * to the backend once on first sign-in. Returns [] on SSR or when nothing
 * was ever stored locally.
 */
export function readLegacyLocalSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Session =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Session).id === "string" &&
        typeof (s as Session).date === "string" &&
        typeof (s as Session).durationMin === "number" &&
        typeof (s as Session).presence === "number",
    );
  } catch {
    return [];
  }
}

/** Clear the legacy localStorage after a successful migration. */
export function clearLegacyLocalSessions() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
