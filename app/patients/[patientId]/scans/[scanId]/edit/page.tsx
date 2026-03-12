import { notFound, redirect } from "next/navigation";

import ScanEntryForm from "@/components/forms/scan-entry-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Patient, Scan, ScanInsert } from "@/types/database";

type PageProps = {
  params: Promise<{
    patientId: string;
    scanId: string;
  }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getValue(formData: FormData, key: keyof ScanInsert | "scan_id"): string {
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

function parseOptionalEnum<T extends string>(formData: FormData, key: keyof ScanInsert, allowed: readonly T[]): T | null {
  const raw = getValue(formData, key);
  if (!raw) return null;
  if (!allowed.includes(raw as T)) {
    throw new Error(`Invalid value for ${String(key)}.`);
  }
  return raw as T;
}

function parseOptionalBoolean(formData: FormData, key: keyof ScanInsert): boolean | null {
  const raw = getValue(formData, key);
  if (!raw) return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`Invalid boolean value for ${String(key)}.`);
}

export default async function EditScanPage({ params }: PageProps) {
  const { patientId, scanId } = await params;
  if (!uuidPattern.test(patientId) || !uuidPattern.test(scanId)) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const [{ data: patient, error: patientError }, { data: scan, error: scanError }] = await Promise.all([
    supabase
      .from("patients")
      .select("hn_number,name,age,sex,height_cm")
      .eq("id", patientId)
      .maybeSingle<Pick<Patient, "hn_number" | "name" | "age" | "sex" | "height_cm">>(),
    supabase.from("scans").select("*").eq("id", scanId).eq("patient_id", patientId).maybeSingle(),
  ]);

  if (patientError) throw new Error(patientError.message);
  if (scanError) throw new Error(scanError.message);
  if (!patient || !scan) notFound();

  const typedScan = scan as Scan;

  async function handleSubmit(formData: FormData) {
    "use server";

    const supabaseClient = createSupabaseServerClient();
    const patient_id = getValue(formData, "patient_id");
    const scan_id = getValue(formData, "scan_id");

    if (patient_id !== patientId || scan_id !== scanId) {
      throw new Error("Mismatched patient or scan ID.");
    }

    const payload: Partial<ScanInsert> = {
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
      waist_circumference_cm: parseOptionalNumber(formData, "waist_circumference_cm"),
      hip_circumference_cm: parseOptionalNumber(formData, "hip_circumference_cm"),
      daily_activity_limitation: parseOptionalEnum(formData, "daily_activity_limitation", [
        "None",
        "Mild",
        "Moderate",
        "Severe",
      ] as const),
      breathlessness_symptom: parseOptionalBoolean(formData, "breathlessness_symptom"),
      joint_pain_mobility_limitation: parseOptionalBoolean(formData, "joint_pain_mobility_limitation"),
      organ_dysfunction_signs: parseOptionalBoolean(formData, "organ_dysfunction_signs"),
      obesity_related_dysfunction: parseOptionalBoolean(formData, "obesity_related_dysfunction"),
    };

    const { error } = await supabaseClient
      .from("scans")
      .update(payload)
      .eq("id", scanId)
      .eq("patient_id", patientId);
    if (error) {
      throw new Error(error.message);
    }

    redirect(`/patients/${patientId}`);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <ScanEntryForm
        patientId={patientId}
        patient={patient}
        onSubmitAction={handleSubmit}
        initialValues={typedScan}
        formTitle="Edit Body Composition Scan"
        submitLabel="Update Scan"
        hiddenFields={{ scan_id: scanId }}
      />
    </main>
  );
}
