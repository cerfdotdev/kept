"use client";

import { useRef, useState, useTransition } from "react";
import { uploadDocument } from "@/lib/actions";

export function UploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setMessage("Files must be under 25 MB.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const contentBase64 = String(reader.result).split(",")[1];
      startTransition(async () => {
        const res = await uploadDocument({
          filename: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          contentBase64,
        });
        setBusy(false);
        setMessage(res?.error ? res.error : "Uploaded — matched and stored with your books.");
        if (inputRef.current) inputRef.current.value = "";
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center">
      <label className="flex-1">
        <span className="sr-only">Choose a document</span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.qbo"
          className="block w-full text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:text-cream hover:file:bg-ink-deep"
        />
      </label>
      <button type="submit" disabled={busy || pending} className="btn-primary text-sm">
        {busy || pending ? "Uploading…" : "Upload"}
      </button>
      {message && <p className="text-sm text-ink-soft sm:pl-2">{message}</p>}
    </form>
  );
}
