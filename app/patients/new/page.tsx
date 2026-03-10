import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PatientInsert, Sex } from "@/types/database";

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveNumber(value: string, fieldName: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a number greater than 0.`);
  }
  return parsed;
}

export default function NewPatientPage() {
  async function createPatientAction(formData: FormData) {
    "use server";

    const supabase = createSupabaseServerClient();
    const name = getString(formData, "name");
    const hn_number = getString(formData, "hn_number");
    const sexRaw = getString(formData, "sex");
    const ageRaw = getString(formData, "age");
    const heightRaw = getString(formData, "height_cm");

    if (!name || !hn_number || !sexRaw || !ageRaw || !heightRaw) {
      throw new Error("All patient fields are required.");
    }

    const sex = sexRaw as Sex;
    if (!["Male", "Female", "Other"].includes(sex)) {
      throw new Error("Invalid sex value.");
    }

    const age = Number.parseInt(ageRaw, 10);
    if (Number.isNaN(age) || age < 0 || age > 130) {
      throw new Error("Age must be between 0 and 130.");
    }

    const height_cm = parsePositiveNumber(heightRaw, "Height");
    const payload: PatientInsert = { hn_number, name, age, sex, height_cm };

    const { data, error } = await supabase.from("patients").insert(payload).select("id").single();
    if (error || !data) {
      throw new Error(error?.message ?? "Unable to create patient.");
    }

    redirect(`/patients/${data.id}/scans/new`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-slate-900">Add New Patient</h1>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              Back to Dashboard
            </Link>
          </div>
          <p className="mt-1 text-sm text-slate-600">Create patient profile before entering scan data.</p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <form action={createPatientAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="hn_number">
                HN Number
              </label>
              <input id="hn_number" name="hn_number" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="name">
                Name
              </label>
              <input id="name" name="name" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="age">
                Age
              </label>
              <input
                id="age"
                name="age"
                type="number"
                min={0}
                max={130}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="sex">
                Sex
              </label>
              <select id="sex" name="sex" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700" htmlFor="height_cm">
                Height (cm)
              </label>
              <input
                id="height_cm"
                name="height_cm"
                type="number"
                min={1}
                step="0.1"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Save Patient and Continue
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
