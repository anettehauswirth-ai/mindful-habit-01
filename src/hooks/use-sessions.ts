import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
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
 * The subset of `PostgrestError` fields we read. Exported so call sites pass a
 * structurally-compatible value — any `PostgrestError` from Supabase fits.
 */
export type PostgrestLikeError = Pick<
  PostgrestError,
  "message" | "code" | "details" | "hint"
>;

/**
 * Coerces whatever Supabase (or PostgREST) returns into a real `Error` with a
 * useful message. Supabase client errors are plain objects, so a naive
 * `err instanceof Error` check misses them and shows a generic fallback.
 */
function toSupabaseError(
  err: PostgrestLikeError,
  verb: "save" | "load" | "delete",
): Error {
  const base = err.message?.trim();
  const hint = err.hint?.trim();
  const code = err.code?.trim();
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

export type SessionUpdate = Partial<NewSession>;

/** Prefix used for the client-assigned id on optimistic rows. */
const TEMP_ID_PREFIX = "temp-";

/**
 * Order sessions the same way the server query does: date desc, createdAt desc.
 * Used when we optimistically insert/patch cached rows so the UI order matches
 * what a refetch would produce.
 */
function compareSessions(a: Session, b: Session): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return 0;
}

/** Apply a partial update to a Session, ignoring undefined fields. */
function mergePatch(s: Session, patch: SessionUpdate): Session {
  const next: Session = { ...s };
  if (patch.date !== undefined) next.date = patch.date;
  if (patch.durationMin !== undefined) next.durationMin = patch.durationMin;
  if (patch.presence !== undefined) next.presence = patch.presence;
  if (patch.notes !== undefined) next.notes = patch.notes;
  return next;
}

type MutationContext = { previous: Session[] };
type AddContext = MutationContext & { tempId: string };

type UseSessionsReturn = {
  sessions: Session[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  add: (s: NewSession) => Promise<Session>;
  isAdding: boolean;
  update: (args: { id: string; patch: SessionUpdate }) => Promise<Session>;
  isUpdating: boolean;
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

  const addMutation = useMutation<Session, Error, NewSession, AddContext>({
    mutationFn: async (input): Promise<Session> => {
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
    onMutate: async (input) => {
      if (!userId) return { previous: [], tempId: "" };
      const key = sessionsKey(userId);
      // Stop any in-flight refetch so it can't overwrite our optimistic cache.
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Session[]>(key) ?? [];
      const tempId = `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
      const optimistic: Session = {
        id: tempId,
        date: input.date,
        createdAt: new Date().toISOString(),
        durationMin: input.durationMin,
        presence: input.presence,
        notes: input.notes,
      };
      qc.setQueryData<Session[]>(
        key,
        [...previous, optimistic].sort(compareSessions),
      );
      return { previous, tempId };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(sessionsKey(userId), ctx.previous);
    },
    onSuccess: (saved, _input, ctx) => {
      if (!userId || !ctx) return;
      // Swap the temp row for the real server row so the id sticks before the
      // reconciling refetch arrives.
      const current = qc.getQueryData<Session[]>(sessionsKey(userId)) ?? [];
      qc.setQueryData<Session[]>(
        sessionsKey(userId),
        current
          .map((s) => (s.id === ctx.tempId ? saved : s))
          .sort(compareSessions),
      );
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: sessionsKey(userId) });
    },
  });

  const updateMutation = useMutation<
    Session,
    Error,
    { id: string; patch: SessionUpdate },
    MutationContext
  >({
    mutationFn: async ({ id, patch }): Promise<Session> => {
      if (!userId) throw new Error("You must be signed in.");
      const dbPatch: TablesUpdate<"sessions"> = {};
      if (patch.date !== undefined) dbPatch.date = patch.date;
      if (patch.durationMin !== undefined) dbPatch.duration_min = patch.durationMin;
      if (patch.presence !== undefined) dbPatch.presence = patch.presence;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      const { data, error } = await supabase
        .from("sessions")
        .update(dbPatch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw toSupabaseError(error, "save");
      return rowToSession(data);
    },
    onMutate: async ({ id, patch }) => {
      if (!userId) return { previous: [] };
      const key = sessionsKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Session[]>(key) ?? [];
      qc.setQueryData<Session[]>(
        key,
        previous
          .map((s) => (s.id === id ? mergePatch(s, patch) : s))
          .sort(compareSessions),
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(sessionsKey(userId), ctx.previous);
    },
    onSuccess: (saved) => {
      if (!userId) return;
      const current = qc.getQueryData<Session[]>(sessionsKey(userId)) ?? [];
      qc.setQueryData<Session[]>(
        sessionsKey(userId),
        current.map((s) => (s.id === saved.id ? saved : s)).sort(compareSessions),
      );
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: sessionsKey(userId) });
    },
  });

  const removeMutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (id): Promise<void> => {
      if (!userId) throw new Error("You must be signed in.");
      const { error } = await supabase.from("sessions").delete().eq("id", id);
      if (error) throw toSupabaseError(error, "delete");
    },
    onMutate: async (id) => {
      if (!userId) return { previous: [] };
      const key = sessionsKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Session[]>(key) ?? [];
      qc.setQueryData<Session[]>(
        key,
        previous.filter((s) => s.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(sessionsKey(userId), ctx.previous);
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: sessionsKey(userId) });
    },
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
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
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
