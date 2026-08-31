"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";
import type { ProfilePhoto } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX = 6;

export function PhotoManager() {
  const [photos, setPhotos] = useState<ProfilePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    apiFetch<ProfilePhoto[]>("/profile-photos/")
      .then(setPhotos)
      .catch(() => setPhotos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, MAX - photos.length)) {
        const fd = new FormData();
        fd.append("image", file);
        await apiFetch("/profile-photos/", { method: "POST", body: fd, raw: true });
      }
      load();
      toast.success("Uploaded. Photos appear once approved by our team.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    setPhotos((p) => p.filter((x) => x.id !== id));
    try {
      await apiFetch(`/profile-photos/${id}/`, { method: "DELETE" });
    } catch (err) {
      handleApiError(err);
      load();
    }
  }

  async function makePrimary(id: number) {
    setPhotos((p) => p.map((x) => ({ ...x, is_primary: x.id === id })));
    try {
      await apiFetch(`/profile-photos/${id}/make-primary/`, { method: "POST" });
    } catch (err) {
      handleApiError(err);
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add up to {MAX} photos. New uploads are reviewed before they show on your
        profile. The starred photo is your main picture.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-[3/4] overflow-hidden rounded-lg border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.image}
              alt=""
              className="size-full object-cover"
            />
            {!photo.is_approved && (
              <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                In review
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => makePrimary(photo.id)}
                className={cn(
                  "rounded p-1 text-white hover:bg-white/20",
                  photo.is_primary && "text-amber-300",
                )}
                aria-label="Make main photo"
              >
                <Star
                  className="size-4"
                  fill={photo.is_primary ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                onClick={() => remove(photo.id)}
                className="rounded p-1 text-white hover:bg-white/20"
                aria-label="Delete photo"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {photos.length < MAX && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            {uploading ? (
              <Spinner className="size-5" />
            ) : (
              <>
                <ImagePlus className="size-6" />
                <span className="text-xs">Add photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
    </div>
  );
}
