import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  compareFocusImages,
  fileExtension,
  PRESET_FOCUS_IMAGES,
  rowToFocusImage,
  type FocusImage,
  type FocusTag,
  type NewFocusImage,
} from "@/lib/focus-images";
import type { PostgrestLikeError } from "@/hooks/use-sessions";

const STORAGE_BUCKET = "focus-images";

const focusImagesKey = (userId: string | undefined) =>
  ["focus-images", userId] as const;

// Module-level guard so concurrent mounts can't trigger duplicate seeding.
const seedState: Map<string, "pending" | "done"> = new Map();

const TEMP_ID_PREFIX = "temp-";

function toFocusError(
  err: PostgrestLikeError,
  verb: "save" | "load" | "delete" | "upload",
): Error {
  const base = err.message?.trim();
  const hint = err.hint?.trim();
  const code = err.code?.trim();
  const missingTable =
    code === "42P01" ||
    (base ? base.toLowerCase().includes("does not exist") : false);
  if (missingTable) {
    return new Error(
      "The `focus_images` table doesn't exist in Supabase yet. Apply the migration in supabase/migrations/ to the project, then try again.",
    );
  }
  const pieces = [base ?? `Could not ${verb} image.`, hint].filter(Boolean);
  return new Error(pieces.join(" — "));
}

type MutationContext = { previous: FocusImage[] };
type AddContext = MutationContext & { tempId: string };

export type AddFocusImageInput =
  | { kind: "url"; url: string; tag: FocusTag }
  | { kind: "file"; file: File; tag: FocusTag };

type UseFocusImagesReturn = {
  images: FocusImage[];
  isLoading: boolean;
  isFetching: boolean;
  isSeeding: boolean;
  error: Error | null;
  add: (input: AddFocusImageInput) => Promise<FocusImage>;
  isAdding: boolean;
  remove: (image: FocusImage) => Promise<void>;
  isRemoving: boolean;
  resetToDefaults: () => Promise<FocusImage[]>;
  isResetting: boolean;
};

export function useFocusImages(): UseFocusImagesReturn {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const [isSeeding, setIsSeeding] = useState(false);

  const query = useQuery({
    queryKey: focusImagesKey(userId),
    enabled: !!userId,
    queryFn: async (): Promise<FocusImage[]> => {
      const { data, error } = await supabase
        .from("focus_images")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw toFocusError(error, "load");
      return (data ?? []).map(rowToFocusImage);
    },
  });

  /**
   * Upload a file to Storage under `<user_id>/<random-uuid>.<ext>` and
   * return the public URL + storage path. Throws on failure.
   */
  const uploadFile = useCallback(
    async (file: File): Promise<{ url: string; storagePath: string }> => {
      if (!userId) throw new Error("You must be signed in to upload.");
      const ext = fileExtension(file);
      const key = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(key, file, {
          cacheControl: "31536000",
          contentType: file.type || undefined,
          upsert: false,
        });
      if (upError) {
        throw new Error(
          upError.message.includes("Bucket not found")
            ? "The `focus-images` storage bucket doesn't exist yet. Apply the storage migration in supabase/migrations/."
            : `Upload failed: ${upError.message}`,
        );
      }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
      return { url: data.publicUrl, storagePath: key };
    },
    [userId],
  );

  /**
   * Best-effort cleanup of an object in Storage. We don't surface errors to
   * the user — a leftover file is annoying but not user-visible.
   */
  const removeStorageObject = useCallback(async (storagePath: string) => {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("Failed to remove storage object:", error.message);
    }
  }, []);

  const addMutation = useMutation<
    FocusImage,
    Error,
    AddFocusImageInput,
    AddContext
  >({
    mutationFn: async (input): Promise<FocusImage> => {
      if (!userId) throw new Error("You must be signed in.");
      let payload: NewFocusImage;
      if (input.kind === "file") {
        const { url, storagePath } = await uploadFile(input.file);
        payload = { url, storagePath, tag: input.tag };
      } else {
        payload = { url: input.url, storagePath: null, tag: input.tag };
      }
      const { data, error } = await supabase
        .from("focus_images")
        .insert({
          user_id: userId,
          url: payload.url,
          storage_path: payload.storagePath ?? null,
          tag: payload.tag,
        })
        .select()
        .single();
      if (error) {
        // If we uploaded but the row insert failed, try to clean the orphan.
        if (payload.storagePath) {
          void removeStorageObject(payload.storagePath);
        }
        throw toFocusError(error, "save");
      }
      return rowToFocusImage(data);
    },
    onMutate: async (input) => {
      if (!userId) return { previous: [], tempId: "" };
      const key = focusImagesKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FocusImage[]>(key) ?? [];
      const tempId = `${TEMP_ID_PREFIX}${crypto.randomUUID()}`;
      // For URL adds we can show a placeholder immediately; file uploads need
      // the real URL after the upload finishes, so we only reserve a slot.
      const optimistic: FocusImage = {
        id: tempId,
        url: input.kind === "url" ? input.url : "",
        storagePath: null,
        tag: input.tag,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<FocusImage[]>(
        key,
        [optimistic, ...previous].sort(compareFocusImages),
      );
      return { previous, tempId };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(focusImagesKey(userId), ctx.previous);
    },
    onSuccess: (saved, _input, ctx) => {
      if (!userId || !ctx) return;
      const current = qc.getQueryData<FocusImage[]>(focusImagesKey(userId)) ?? [];
      qc.setQueryData<FocusImage[]>(
        focusImagesKey(userId),
        current
          .map((i) => (i.id === ctx.tempId ? saved : i))
          .sort(compareFocusImages),
      );
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: focusImagesKey(userId) });
    },
  });

  const removeMutation = useMutation<void, Error, FocusImage, MutationContext>({
    mutationFn: async (image): Promise<void> => {
      if (!userId) throw new Error("You must be signed in.");
      const { error } = await supabase
        .from("focus_images")
        .delete()
        .eq("id", image.id);
      if (error) throw toFocusError(error, "delete");
      // Clean up the storage object after the row is gone. Order matters:
      // if the storage delete failed first, we'd lose the row pointer.
      if (image.storagePath) {
        await removeStorageObject(image.storagePath);
      }
    },
    onMutate: async (image) => {
      if (!userId) return { previous: [] };
      const key = focusImagesKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FocusImage[]>(key) ?? [];
      qc.setQueryData<FocusImage[]>(
        key,
        previous.filter((i) => i.id !== image.id),
      );
      return { previous };
    },
    onError: (_err, _image, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(focusImagesKey(userId), ctx.previous);
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: focusImagesKey(userId) });
    },
  });

  // Reset to defaults: wipe the user's library (DB rows + uploaded files)
  // and re-seed the presets. Destructive — confirmation lives on the page.
  const resetMutation = useMutation<FocusImage[], Error, void, MutationContext>({
    mutationFn: async (): Promise<FocusImage[]> => {
      if (!userId) throw new Error("You must be signed in.");
      // Snapshot the user's uploaded storage objects so we can clean them up
      // after the row delete succeeds.
      const previous = qc.getQueryData<FocusImage[]>(focusImagesKey(userId)) ?? [];
      const uploadedKeys = previous
        .map((i) => i.storagePath)
        .filter((p): p is string => !!p);

      const { error: delError } = await supabase
        .from("focus_images")
        .delete()
        .eq("user_id", userId);
      if (delError) throw toFocusError(delError, "delete");

      if (uploadedKeys.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(uploadedKeys);
        if (storageError) {
          // eslint-disable-next-line no-console
          console.warn(
            "Failed to remove uploaded files during reset:",
            storageError.message,
          );
        }
      }

      const rows = PRESET_FOCUS_IMAGES.map((p) => ({
        user_id: userId,
        url: p.url,
        storage_path: null,
        tag: p.tag,
      }));
      const { data, error } = await supabase
        .from("focus_images")
        .insert(rows)
        .select();
      if (error) throw toFocusError(error, "save");
      return (data ?? []).map(rowToFocusImage);
    },
    onMutate: async () => {
      if (!userId) return { previous: [] };
      const key = focusImagesKey(userId);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<FocusImage[]>(key) ?? [];
      const now = new Date().toISOString();
      const optimistic: FocusImage[] = PRESET_FOCUS_IMAGES.map((p, i) => ({
        id: `${TEMP_ID_PREFIX}reset-${i}`,
        url: p.url,
        storagePath: null,
        tag: p.tag,
        createdAt: now,
      })).sort(compareFocusImages);
      qc.setQueryData<FocusImage[]>(key, optimistic);
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (!userId || !ctx) return;
      qc.setQueryData(focusImagesKey(userId), ctx.previous);
    },
    onSuccess: (saved) => {
      if (!userId) return;
      qc.setQueryData<FocusImage[]>(
        focusImagesKey(userId),
        [...saved].sort(compareFocusImages),
      );
      seedState.set(userId, "done");
    },
    onSettled: () => {
      if (!userId) return;
      void qc.invalidateQueries({ queryKey: focusImagesKey(userId) });
    },
  });

  // Seed presets on first empty-list load, once per user per browser session.
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
      const rows = PRESET_FOCUS_IMAGES.map((p) => ({
        user_id: userId,
        url: p.url,
        storage_path: null,
        tag: p.tag,
      }));
      const { error } = await supabase.from("focus_images").insert(rows);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("Failed to seed preset focus images:", error.message);
        seedState.delete(userId);
        return;
      }
      seedState.set(userId, "done");
      await qc.invalidateQueries({ queryKey: focusImagesKey(userId) });
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
    images: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSeeding,
    error: (query.error as Error | null) ?? null,
    add: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    remove: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,
    resetToDefaults: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  };
}
