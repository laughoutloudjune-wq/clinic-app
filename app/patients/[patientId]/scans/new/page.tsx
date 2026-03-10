import { notFound, redirect } from "next/navigation";

import ScanEntryForm from "@/components/forms/scan-entry-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Patient, ScanInsert } from "@/types/database";

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getValue(formData: FormData, key: keyof ScanInsert): string {
  const value = formData.get(key);
  if (typeof value !== "string") {
    throw new Error(`Missing field: ${String(key)}`);
  }
  return value.trim();
}

function parseRequiredNumber(formData: FormData, key: keyof ScanInsert, isInteger = false): number {
  const raw = getValue(formData, key);
  const num = isInteger ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid numeric value for ${String(key)}.`);
  }
  return num;
}

function parseOptionalNumber(formData: FormData, key: keyof ScanInsert): number | null {
  const raw = getValue(formData, key);
  if (!raw) return null;
  const num = Number.parseFloat(raw);
  if (Number.isNaN(num)) {
    throw new Error(`Invalid numeric value for ${String(key)}.`);
  }
  return num;
}

function parseOptionalDateTime(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid scan_date value.");
  }
  return date.toISOString();
}

export default async function NewScanPage({ params }: PageProps) {
  const { patientId } = await params;
  if (!uuidPattern.test(patientId)) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("hn_number,name,age,sex,height_cm")
    .eq("id", patientId)
    .maybeSingle<Pick<Patient, "hn_number" | "name" | "age" | "sex" | "height_cm">>();

  if (patientError) {
    throw new Error(patientError.message);
  }
  if (!patient) {
    notFound();
  }

  async function handleSubmit(formData: FormData) {
    "use server";

    const supabaseClient = createSupabaseServerClient();
    const patient_id = getValue(formData, "patient_id");

    if (patient_id !== patientId) {
      throw new Error("Mismatched patient ID.");
    }

    const payload: ScanInsert = {
      patient_id,
      scan_date: parseOptionalDateTime(formData.get("scan_date")),
      weight_kg: parseRequiredNumber(formData, "weight_kg"),
      bmi: parseRequiredNumber(formData, "bmi"),
      body_fat_percent: parseRequiredNumber(formData, "body_fat_percent"),
      body_fat_kg: parseRequiredNumber(formData, "body_fat_kg"),
      subcutaneous_fat_total_percent: parseRequiredNumber(formData, "subcutaneous_fat_total_percent"),
      subcutaneous_fat_arms_percent: parseRequiredNumber(formData, "subcutaneous_fat_arms_percent"),
      subcutaneous_fat_trunk_percent: parseRequiredNumber(formData, "subcutaneous_fat_trunk_percent"),
      subcutaneous_fat_legs_percent: parseRequiredNumber(formData, "subcutaneous_fat_legs_percent"),
      skeletal_muscle_total_percent: parseRequiredNumber(formData, "skeletal_muscle_total_percent"),
      skeletal_muscle_total_kg: parseRequiredNumber(formData, "skeletal_muscle_total_kg"),
      skeletal_muscle_arms_percent: parseRequiredNumber(formData, "skeletal_muscle_arms_percent"),
      skeletal_muscle_trunk_percent: parseRequiredNumber(formData, "skeletal_muscle_trunk_percent"),
      skeletal_muscle_legs_percent: parseRequiredNumber(formData, "skeletal_muscle_legs_percent"),
      visceral_fat_level: parseRequiredNumber(formData, "visceral_fat_level", true),
      resting_metabolism_kcal: parseRequiredNumber(formData, "resting_metabolism_kcal", true),
      body_age_years: parseRequiredNumber(formData, "body_age_years", true),
      total_body_water_l: parseOptionalNumber(formData, "total_body_water_l"),
      protein_kg: parseOptionalNumber(formData, "protein_kg"),
      minerals_kg: parseOptionalNumber(formData, "minerals_kg"),
    };

    const { error } = await supabaseClient.from("scans").insert(payload);
    if (error) {
      throw new Error(error.message);
    }

    redirect(`/patients/${patientId}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <ScanEntryForm patientId={patientId} patient={patient} onSubmitAction={handleSubmit} />
    </main>
  );
}
