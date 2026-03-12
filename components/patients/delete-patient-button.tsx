"use client";

import { useState, useTransition } from "react";

interface DeletePatientButtonProps {
  patientId: string;
  patientName: string;
  onDeleteAction: (formData: FormData) => Promise<void>;
}

export default function DeletePatientButton({ patientId, patientName, onDeleteAction }: DeletePatientButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitAction = (formData: FormData) => {
    const confirmed = window.confirm(
      `Delete patient "${patientName}" and all scan records? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await onDeleteAction(formData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to delete patient.";
        setError(message);
      }
    });
  };

  return (
    <form action={submitAction} className="space-y-2">
      <input type="hidden" name="patient_id" value={patientId} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded border border-red-700 bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Deleting..." : "Delete Patient"}
      </button>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </form>
  );
}
