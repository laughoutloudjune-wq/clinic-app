"use client";

import { useState, useTransition } from "react";

import type { Patient } from "@/types/database";

type InputType = "number" | "datetime-local";

interface FieldConfig {
  id: string;
  label: string;
  type?: InputType;
  step?: string;
  required?: boolean;
  min?: number;
}

interface FieldSection {
  title: string;
  description: string;
  fields: FieldConfig[];
}

interface ScanEntryFormProps {
  patientId: string;
  patient: Pick<Patient, "hn_number" | "name" | "age" | "sex" | "height_cm">;
  onSubmitAction: (formData: FormData) => Promise<void>;
}

const sections: FieldSection[] = [
  {
    title: "Scan Metadata",
    description: "Date and time of the measurement.",
    fields: [
      {
        id: "scan_date",
        label: "Scan Date & Time",
        type: "datetime-local",
        required: false,
      },
    ],
  },
  {
    title: "Overall Metrics",
    description: "Core smart-scale body composition values.",
    fields: [
      { id: "weight_kg", label: "Weight (kg)", step: "0.01", required: true, min: 0 },
      { id: "bmi", label: "BMI", step: "0.01", required: true, min: 0 },
      { id: "body_fat_percent", label: "Body Fat (%)", step: "0.01", required: true, min: 0 },
      { id: "body_fat_kg", label: "Body Fat (kg)", step: "0.01", required: true, min: 0 },
      {
        id: "skeletal_muscle_total_percent",
        label: "Skeletal Muscle Total (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "skeletal_muscle_total_kg",
        label: "Skeletal Muscle Total (kg)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "visceral_fat_level",
        label: "Visceral Fat (level)",
        step: "1",
        required: true,
        min: 0,
      },
      {
        id: "resting_metabolism_kcal",
        label: "Resting Metabolism (kcal)",
        step: "1",
        required: true,
        min: 0,
      },
      {
        id: "body_age_years",
        label: "Body Age (years)",
        step: "1",
        required: true,
        min: 0,
      },
    ],
  },
  {
    title: "Subcutaneous Fat Breakdown",
    description: "Regional subcutaneous fat percentages.",
    fields: [
      {
        id: "subcutaneous_fat_total_percent",
        label: "Subcutaneous Fat Total (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "subcutaneous_fat_arms_percent",
        label: "Subcutaneous Fat Arms (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "subcutaneous_fat_trunk_percent",
        label: "Subcutaneous Fat Trunk (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "subcutaneous_fat_legs_percent",
        label: "Subcutaneous Fat Legs (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
    ],
  },
  {
    title: "Skeletal Muscle Breakdown",
    description: "Regional skeletal muscle percentages.",
    fields: [
      {
        id: "skeletal_muscle_arms_percent",
        label: "Skeletal Muscle Arms (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "skeletal_muscle_trunk_percent",
        label: "Skeletal Muscle Trunk (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
      {
        id: "skeletal_muscle_legs_percent",
        label: "Skeletal Muscle Legs (%)",
        step: "0.01",
        required: true,
        min: 0,
      },
    ],
  },
  {
    title: "Optional Clinical Metrics",
    description: "These values can be left blank.",
    fields: [
      { id: "total_body_water_l", label: "Total Body Water (L)", step: "0.01", min: 0 },
      { id: "protein_kg", label: "Protein (kg)", step: "0.01", min: 0 },
      { id: "minerals_kg", label: "Minerals (kg)", step: "0.01", min: 0 },
    ],
  },
];

function MetricInput({ field }: { field: FieldConfig }) {
  return (
    <div className="space-y-2">
      <label htmlFor={field.id} className="block text-sm font-medium text-slate-700">
        {field.label}
      </label>
      <input
        id={field.id}
        name={field.id}
        type={field.type ?? "number"}
        required={field.required ?? false}
        step={field.step}
        min={field.min}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring-2"
      />
    </div>
  );
}

export default function ScanEntryForm({ patientId, patient, onSubmitAction }: ScanEntryFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitHandler = (formData: FormData) => {
    setError(null);
    formData.set("patient_id", patientId);
    startTransition(async () => {
      try {
        await onSubmitAction(formData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to save scan.";
        setError(message);
      }
    });
  };

  return (
    <form action={submitHandler} className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">New Body Composition Scan</h1>
        <p className="mt-1 text-sm text-slate-600">Patient ID: {patientId}</p>
        <p className="mt-1 text-sm text-slate-700">
          {patient.name} | HN: {patient.hn_number} | Age: {patient.age} | Sex: {patient.sex} | Height:{" "}
          {patient.height_cm} cm
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.fields.map((field) => (
              <MetricInput key={field.id} field={field} />
            ))}
          </div>
        </section>
      ))}

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="sticky bottom-0 rounded-lg border border-slate-200 bg-white p-4">
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
        >
          {isPending ? "Saving..." : "Save Scan"}
        </button>
      </div>
    </form>
  );
}
