import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  clearLegacyLocalSessions,
  readLegacyLocalSessions,
  rowToSession,
  type NewSession,
  type Session,
} from "@/lib/sessions";

const sessionsKey = (userId: string | undefined) => ["sessions", userId] as const;

// Module-level so concurrent mounts of useSessions can't trigger duplicate
// legacy migrations. Keyed by Supabase user id.
const legacyMigrationState: Map<string, "pending" | "done"> = new Map();

/**
 * Coerces whatever Supabase (or PostgREST) returns into a real `Error` with a
 * useful message. Supabase client errors are plain objects, so a naive
 * `err instanceof Error` check misses them and shows a generic fallback.
 */
function toSupabaseError(
  err: { message?: string; code?: string; details?: string; hint?: string },
  verb: "save" | "load" | "delete",
): Error {
  const base = err?.message?.trim();
  const hint = err?.hint?.trim();
  const code = err?.code?.trim();
  const missingTable =
    code === "42P01" ||
    (base ? base.toLowerCase().includes("does not exist") : false);
  if (missingTable) {
    return new Error(
      "The `sessions` table doesn't exist in Supabase yet. Apply the migration in supabase/migrations/ to the project, then try again.",
    );
  }
  const pieces = [base ?? `Could not ${verb} session.`, hint].filter(Boolean);
  return new Error(pieces.join(" — "));
}

type UseSessionsReturn = {
  sessions: Session[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  add: (s: NewSession) => Promise<Session>;
  isAdding: boolean;
  remove: (id: string) => Promise<void>;
  isRemoving: boolean;
};

export function useSessions(): UseSessionsReturn {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: sessionsKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Session[]> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(rowToSession);
    },
  });

  const addMutation = useMutation({
    mutationFn: async (input: NewSession): Promise<Session> => {
      if (!userId) throw new Error("You must be signed in to save a session.");
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: userId,
          date: input.date,
          duration_min: input.durationMin,
          presence: input.presence,
          notes: input.notes,
        })
        .select()
        .single();
      if (error) throw toSupabaseError(error, "save");
      return rowToSession(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(userId) }),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!userId) throw new Error("You must be signed in.");
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw toSupabaseError(error, "delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(userId) }),
  });

  // One-time migration: if the user has legacy localStorage sessions from the
  // pre-Supabase build, push them up and then clear local storage.
  useLegacyLocalMigration(userId);

  return {
    sessions: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: (query.error as Error | null) ?? null,
    add: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
  };
}

/**
 * Migrates any sessions stored in the legacy `localStorage` bucket to the
 * authenticated user's Supabase rows. Runs at most once per browser per user
 * across all hook instances.
 */
function useLegacyLocalMigration(userId: string | undefined) {
  const qc = useQueryClient();

  const migrate = useCallback(async () => {
    if (!userId) return;
    if (legacyMigrationState.get(userId)) return;
    legacyMigrationState.set(userId, "pending");

    const legacy = readLegacyLocalSessions();
    if (legacy.length === 0) {
      legacyMigrationState.set(userId, "done");
      return;
    }

    const rows = legacy.map((s) => ({
      user_id: userId,
      date: s.date,
      duration_min: s.durationMin,
      presence: s.presence,
      notes: s.notes ?? "",
      created_at: s.createdAt,
    }));

    const { error } = await supabase.from("sessions").insert(rows);
    if (error) {
      // Don't wipe local data if the upload failed — let the user try again.
      // eslint-disable-next-line no-console
      console.warn("Failed to migrate legacy sessions:", error.message);
      legacyMigrationState.delete(userId);
      return;
    }
    clearLegacyLocalSessions();
    legacyMigrationState.set(userId, "done");
    qc.invalidateQueries({ queryKey: sessionsKey(userId) });
  }, [qc, userId]);

  useEffect(() => {
    void migrate();
  }, [migrate]);
}
