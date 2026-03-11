"use client";

import { useState, useTransition } from "react";

import type { Patient } from "@/types/database";

type InputType = "number" | "datetime-local" | "select";

interface SelectOption {
  value: string;
  label: string;
}

interface FieldConfig {
  id: string;
  label: string;
  type?: InputType;
  step?: string;
  required?: boolean;
  min?: number;
  options?: SelectOption[];
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
    title: "Clinical Screening (No Lab)",
    description: "Quick clinic observations used for obesity screening context.",
    fields: [
      { id: "waist_circumference_cm", label: "Waist Circumference (cm)", step: "0.1", min: 0 },
      { id: "hip_circumference_cm", label: "Hip Circumference (cm)", step: "0.1", min: 0 },
      {
        id: "daily_activity_limitation",
        label: "Daily Activity Limitation",
        type: "select",
        options: [
          { value: "None", label: "None" },
          { value: "Mild", label: "Mild" },
          { value: "Moderate", label: "Moderate" },
          { value: "Severe", label: "Severe" },
        ],
      },
      {
        id: "breathlessness_symptom",
        label: "Breathlessness Symptom",
        type: "select",
        options: [
          { value: "", label: "Not Assessed" },
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
      {
        id: "joint_pain_mobility_limitation",
        label: "Joint Pain / Mobility Limitation",
        type: "select",
        options: [
          { value: "", label: "Not Assessed" },
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
      {
        id: "organ_dysfunction_signs",
        label: "Organ Dysfunction Signs",
        type: "select",
        options: [
          { value: "", label: "Not Assessed" },
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
      },
      {
        id: "obesity_related_dysfunction",
        label: "Dysfunction Obesity-Related",
        type: "select",
        options: [
          { value: "", label: "Not Assessed" },
          { value: "false", label: "No" },
          { value: "true", label: "Yes" },
        ],
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

interface MetricInputFieldProps {
  field: FieldConfig;
  value?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  helperText?: string;
}

function MetricInputField({ field, value, onChange, readOnly = false, helperText }: MetricInputFieldProps) {
  if (field.type === "select" && field.options) {
    return (
      <div className="space-y-2">
        <label htmlFor={field.id} className="block text-sm font-medium text-slate-700">
          {field.label}
        </label>
        <select
          id={field.id}
          name={field.id}
          required={field.required ?? false}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring-2"
          defaultValue={field.options[0]?.value ?? ""}
        >
          {field.options.map((option) => (
            <option key={`${field.id}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      </div>
    );
  }

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
        value={value}
        onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
        readOnly={readOnly}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring-2"
      />
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
    </div>
  );
}

export default function ScanEntryForm({ patientId, patient, onSubmitAction }: ScanEntryFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [weightKg, setWeightKg] = useState("");

  const heightM = patient.height_cm > 0 ? patient.height_cm / 100 : 0;
  const canAutoCalculateBmi = heightM > 0;
  const parsedWeight = Number.parseFloat(weightKg);
  const bmiValue =
    canAutoCalculateBmi && Number.isFinite(parsedWeight) && parsedWeight > 0
      ? (parsedWeight / (heightM * heightM)).toFixed(2)
      : "";

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

  const getSectionGridClass = (sectionTitle: string) => {
    if (sectionTitle === "Overall Metrics") {
      return "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";
    }
    if (sectionTitle === "Clinical Screening (No Lab)") {
      return "grid grid-cols-1 gap-5 md:grid-cols-2";
    }
    return "grid grid-cols-1 gap-5 md:grid-cols-2";
  };

  const isFutureOptionalSection = (sectionTitle: string) =>
    sectionTitle === "Clinical Screening (No Lab)" || sectionTitle === "Optional Clinical Metrics";

  return (
    <form action={submitHandler} className="mx-auto max-w-6xl space-y-7 p-4 md:p-8">
      <div className="rounded-xl border border-slate-200 bg-white p-7">
        <h1 className="text-2xl font-semibold text-slate-900">New Body Composition Scan</h1>
        <p className="mt-1 text-sm text-slate-600">Patient ID: {patientId}</p>
        <p className="mt-1 text-sm text-slate-700">
          {patient.name} | HN: {patient.hn_number} | Age: {patient.age} | Sex: {patient.sex} | Height:{" "}
          {patient.height_cm} cm
        </p>
      </div>

      {sections.map((section) => {
        const fieldsContent = (
          <div className={getSectionGridClass(section.title)}>
            {section.fields.map((field) => (
              <MetricInputField
                key={field.id}
                field={field}
                value={field.id === "weight_kg" ? weightKg : field.id === "bmi" ? bmiValue : undefined}
                onChange={field.id === "weight_kg" ? setWeightKg : undefined}
                readOnly={field.id === "bmi" && canAutoCalculateBmi}
                helperText={
                  field.id === "bmi" && canAutoCalculateBmi
                    ? "Auto-calculated from weight and height using BMI = kg/m^2."
                    : undefined
                }
              />
            ))}
          </div>
        );

        if (isFutureOptionalSection(section.title)) {
          return (
            <details key={section.title} className="rounded-xl border border-slate-200 bg-white p-7">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                    Optional Data • For Future Use
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{section.description}</p>
              </summary>
              <div className="mt-5">{fieldsContent}</div>
            </details>
          );
        }

        return (
          <section key={section.title} className="rounded-xl border border-slate-200 bg-white p-7">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{section.description}</p>
            </div>
            {fieldsContent}
          </section>
        );
      })}

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="sticky bottom-0 rounded-xl border border-slate-200 bg-white p-4">
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
