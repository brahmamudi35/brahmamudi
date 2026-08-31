"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import { handleApiError } from "@/lib/form";

interface Horoscope {
  id: number;
  file: string;
  original_name: string;
  is_pdf: boolean;
  is_approved: boolean;
}

export function HoroscopeManager() {
  const [doc, setDoc] = useState<Horoscope | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<Horoscope>("/profiles/me/horoscope/")
      .then(setDoc)
      .catch(() => setDoc(null));
  }, []);

  async function upload(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const saved = await apiFetch<Horoscope>("/profiles/me/horoscope/", {
        method: "POST",
        body: fd,
        raw: true,
      });
      setDoc(saved);
      toast.success("Horoscope uploaded.");
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await apiFetch("/profiles/me/horoscope/", { method: "DELETE" });
      setDoc(null);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  }

  if (doc === undefined)
    return <Spinner className="text-primary" />;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Attach your jataka / kundali as a PDF or an image (max 15 MB). It stays
        private — only members who unlock your contact details can view it.
      </p>

      {doc ? (
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <FileText className="size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <a
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm font-medium hover:underline"
            >
              {doc.original_name || (doc.is_pdf ? "horoscope.pdf" : "horoscope")}
            </a>
            <span className="text-xs text-muted-foreground">
              {doc.is_approved ? "Approved" : "Awaiting review"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={remove}
            aria-label="Remove horoscope"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? <Spinner /> : <Upload className="size-4" />}
        {doc ? "Replace" : "Upload horoscope"}
      </Button>
    </div>
  );
}
