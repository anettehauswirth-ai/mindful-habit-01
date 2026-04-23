import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/use-auth";
import {
  compareMantras,
  PRESET_MANTRAS,
  rowToMantra,
  type Mantra,
  type NewMantra,
} from "@/lib/mantras";
import type { PostgrestLikeError } from "@/hooks/use-sessions";

const mantrasKey = (userId: string | undefined) =>
  ["mantras", userId] as const;

// Module-level guard so concurrent mounts can't trigger duplicate preset seeding.
const seedState: Map<string, "pending" | "done"> = new Map();

/** Prefix used for the client-assigned id on optimistic rows. */
const TEMP_ID_PREFIX = "temp-";

function toMantraError(
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
      "The `mantras` table doesn't exist in Supabase yet. Apply the migration in supabase/migrations/ to the project, then try again.",
    );
  }
  const pieces = [base ?? `Could not ${verb} mantra.`, hint].filter(Boolean);
  return new Error(pieces.join(" — "));
}

export type MantraUpdate = Partial<NewMantra>;

/** Apply a partial update to a Mantra, ignoring undefined fields. */
function mergePatch(m: Mantra, patch: MantraUpdate): Mantra {
  const next: Mantra = { ...m };
  if (patch.text !== undefined) next.text = patch.text;
  if (patch.rating !== undefined) next.rating = patch.rating;
  return next;
}

type MutationContext = { previous: Mantra[] };
type AddContext = MutationContext & { tempId: string };

type UseMantrasReturn = {
  mantras: Mantra[];
  isLoading: boolean;
  isFetching: boolean;
  isSeeding: boolean;
  error: Error | null;
  add: (m: NewMantra) => Promise<Mantra>;
  isAdding: boolean;
  update: (args: { id: string; patch: MantraUpdate }) => Promise<Mantra>;
  isUpdating: boolean;
  remove: (id: string) => Promise<void>;
  isRemoving: boolean;
  resetToDefaults: () => Promise<Mantra[]>;
  isResetting: boolean;
};

export function useMantras(): UseMantrasReturn {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const [isSeeding, setIsSeeding] = useState(false);

  const query = useQuery({
    queryKey: mantrasKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<Mantra[]> => {
      const { data, error } = await supabase
        .from("mantras")
        .select("*")
        .order("rating", { ascending: false, nullsFirst: false })
        .order("text", { ascending: true });
      if (error) throw toMantraError(error, "load");
      return (data ?? []).map(rowToMantra);
    },
  });

  const addMutation = useMutation<Mantra, Error, NewMantra, AddContext>({
    mutationFn: async (input): Promise<Mantra> => {
      if (!userId) throw new Error("You must be signed in to add a mantra.");
      const { data, error } = await supabase
        .from("mantras")
        .insert({
          user_id: userId,
          text: input.text,
          rating: input.rating,
        })
        .select()
        .single();
      if (error) throw toMantraError(error, "save");
      return rowToMantra(data);
    },
    onMutate: async (input) => {
      if (!userId) return { previous: [], tempId: "" };
      const key = mantrasKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Mantra[]>(key) ?? [];
      const tempId = `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
      const optimistic: Mantra = {
        id: tempId,
        text: input.text,
        rating: input.rating,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Mantra[]>(
        key,
        [...previous, optimistic].sort(compareMantras),
      );
      return { previous, tempId };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(mantrasKey(userId), ctx.previous);
    },
    onSuccess: (saved, _input, ctx) => {
      if (!userId || !ctx) return;
      const current = qc.getQueryData<Mantra[]>(mantrasKey(userId)) ?? [];
      qc.setQueryData<Mantra[]>(
        mantrasKey(userId),
        current
          .map((m) => (m.id === ctx.tempId ? saved : m))
          .sort(compareMantras),
      );
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: mantrasKey(userId) });
    },
  });

  const updateMutation = useMutation<
    Mantra,
    Error,
    { id: string; patch: MantraUpdate },
    MutationContext
  >({
    mutationFn: async ({ id, patch }): Promise<Mantra> => {
      if (!userId) throw new Error("You must be signed in.");
      const dbPatch: TablesUpdate<"mantras"> = {};
      if (patch.text !== undefined) dbPatch.text = patch.text;
      if (patch.rating !== undefined) dbPatch.rating = patch.rating;
      const { data, error } = await supabase
        .from("mantras")
        .update(dbPatch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw toMantraError(error, "save");
      return rowToMantra(data);
    },
    onMutate: async ({ id, patch }) => {
      if (!userId) return { previous: [] };
      const key = mantrasKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Mantra[]>(key) ?? [];
      qc.setQueryData<Mantra[]>(
        key,
        previous
          .map((m) => (m.id === id ? mergePatch(m, patch) : m))
          .sort(compareMantras),
      );
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(mantrasKey(userId), ctx.previous);
    },
    onSuccess: (saved) => {
      if (!userId) return;
      const current = qc.getQueryData<Mantra[]>(mantrasKey(userId)) ?? [];
      qc.setQueryData<Mantra[]>(
        mantrasKey(userId),
        current
          .map((m) => (m.id === saved.id ? saved : m))
          .sort(compareMantras),
      );
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: mantrasKey(userId) });
    },
  });

  const removeMutation = useMutation<void, Error, string, MutationContext>({
    mutationFn: async (id): Promise<void> => {
      if (!userId) throw new Error("You must be signed in.");
      const { error } = await supabase.from("mantras").delete().eq("id", id);
      if (error) throw toMantraError(error, "delete");
    },
    onMutate: async (id) => {
      if (!userId) return { previous: [] };
      const key = mantrasKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Mantra[]>(key) ?? [];
      qc.setQueryData<Mantra[]>(
        key,
        previous.filter((m) => m.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(mantrasKey(userId), ctx.previous);
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: mantrasKey(userId) });
    },
  });

  // Reset to defaults: wipe all the user's mantras and re-seed the presets.
  // Destructive by design — the alert dialog on the page is what protects the
  // user from clicking it accidentally.
  const resetMutation = useMutation<Mantra[], Error, void, MutationContext>({
    mutationFn: async (): Promise<Mantra[]> => {
      if (!userId) throw new Error("You must be signed in.");
      const { error: delError } = await supabase
        .from("mantras")
        .delete()
        .eq("user_id", userId);
      if (delError) throw toMantraError(delError, "delete");
      const rows = PRESET_MANTRAS.map((text) => ({
        user_id: userId,
        text,
        rating: null,
      }));
      const { data, error } = await supabase
        .from("mantras")
        .insert(rows)
        .select();
      if (error) throw toMantraError(error, "save");
      return (data ?? []).map(rowToMantra);
    },
    onMutate: async () => {
      if (!userId) return { previous: [] };
      const key = mantrasKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Mantra[]>(key) ?? [];
      // Optimistically show the preset list (unrated) so the UI reacts
      // instantly; onSuccess swaps in the server rows with real ids.
      const now = new Date().toISOString();
      const optimistic: Mantra[] = PRESET_MANTRAS.map((text, i) => ({
        id: `${TEMP_ID_PREFIX}reset-${i}`,
        text,
        rating: null,
        createdAt: now,
      })).sort(compareMantras);
      qc.setQueryData<Mantra[]>(key, optimistic);
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(mantrasKey(userId), ctx.previous);
    },
    onSuccess: (saved) => {
      if (!userId) return;
      qc.setQueryData<Mantra[]>(
        mantrasKey(userId),
        [...saved].sort(compareMantras),
      );
      // The user just explicitly re-populated — mark the seed guard done so
      // the one-time seeder doesn't race and try to insert duplicates.
      seedState.set(userId, "done");
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: mantrasKey(userId) });
    },
  });

  // Seed the preset mantras on first empty-list load, once per user per
  // browser session. The unique (user_id, text) index on the table is a
  // safety net against accidental double-seeds (e.g. two tabs racing).
  const seed = useCallback(async () => {
    if (!userId) return;
    if (seedState.get(userId)) return;
    if (query.isLoading || query.isFetching) return;
    if (!query.isSuccess) return;
    if ((query.data ?? []).length > 0) {
      seedState.set(userId, "done");
      return;
    }
    seedState.set(userId, "pending");
    setIsSeeding(true);
    try {
      const rows = PRESET_MANTRAS.map((text) => ({
        user_id: userId,
        text,
        rating: null,
      }));
      const { error } = await supabase.from("mantras").insert(rows);
      if (error) {
        // Don't leave the guard as "pending" — allow a retry on next mount.
        // eslint-disable-next-line no-console
        console.warn("Failed to seed preset mantras:", error.message);
        seedState.delete(userId);
        return;
      }
      seedState.set(userId, "done");
      await qc.invalidateQueries({ queryKey: mantrasKey(userId) });
    } finally {
      setIsSeeding(false);
    }
  }, [
    userId,
    qc,
    query.isLoading,
    query.isFetching,
    query.isSuccess,
    query.data,
  ]);

  useEffect(() => {
    void seed();
  }, [seed]);

  return {
    mantras: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSeeding,
    error: (query.error as Error | null) ?? null,
    add: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    resetToDefaults: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  };
}
