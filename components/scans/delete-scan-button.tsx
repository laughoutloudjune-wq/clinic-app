"use client";

import { useState, useTransition } from "react";

interface DeleteScanButtonProps {
  scanId: string;
  onDeleteAction: (formData: FormData) => Promise<void>;
}

export default function DeleteScanButton({ scanId, onDeleteAction }: DeleteScanButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitAction = (formData: FormData) => {
    const confirmed = window.confirm("Delete this scan record? This cannot be undone.");
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await onDeleteAction(formData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to delete scan.";
        setError(message);
      }
    });
  };

  return (
    <form action={submitAction} className="space-y-1">
      <input type="hidden" name="scan_id" value={scanId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-red-700 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete Scan"}
      </button>
      {error ? <p className="text-[11px] text-red-700">{error}</p> : null}
    </form>
  );
}
