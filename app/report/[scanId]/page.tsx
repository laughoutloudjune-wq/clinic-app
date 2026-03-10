import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Patient, Scan } from "@/types/database";

type PageProps = {
  params: Promise<{
    scanId: string;
  }>;
  searchParams: Promise<{
    pdf?: string;
  }>;
};

type ScanWithPatient = Scan & {
  patients: Pick<Patient, "id" | "hn_number" | "name" | "age" | "sex" | "height_cm" | "created_at">;
};

type BodyFigureValues = {
  arms: number;
  trunk: number;
  legs: number;
  total: number;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmt(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(digits);
}

function clampPercent(value: number, min: number, max: number) {
  if (max <= min) return 0;
  const ratio = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, ratio));
}

function BodyFigure({
  title,
  values,
  tone,
  size = "md",
}: {
  title: string;
  values: BodyFigureValues;
  tone: "muscle" | "fat";
  size?: "sm" | "md" | "lg";
}) {
  const chipClass =
    tone === "muscle"
      ? "rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"
      : "rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700";
  const bodySize = size === "sm" ? "h-32 w-28" : size === "lg" ? "h-56 w-44" : "h-44 w-36";

  return (
    <div className="rounded-md border border-slate-200 p-2">
      <h3 className="mb-1 text-sm font-semibold text-slate-700">{title}</h3>
      <div className={`relative mx-auto mt-1 ${bodySize}`}>
        <svg viewBox="0 0 120 220" className="h-full w-full text-slate-200">
          <circle cx="60" cy="20" r="14" fill="currentColor" />
          <rect x="46" y="36" width="28" height="58" rx="12" fill="currentColor" />
          <rect x="22" y="44" width="18" height="56" rx="9" fill="currentColor" />
          <rect x="80" y="44" width="18" height="56" rx="9" fill="currentColor" />
          <rect x="46" y="94" width="12" height="95" rx="8" fill="currentColor" />
          <rect x="62" y="94" width="12" height="95" rx="8" fill="currentColor" />
        </svg>
        <span className={`absolute left-0 top-8 ${chipClass}`}>Arms {fmt(values.arms, 1)}%</span>
        <span className={`absolute right-0 top-8 ${chipClass}`}>Arms {fmt(values.arms, 1)}%</span>
        <span className={`absolute left-1/2 top-[62px] -translate-x-1/2 ${chipClass}`}>Trunk {fmt(values.trunk, 1)}%</span>
        <span className={`absolute left-0 bottom-4 ${chipClass}`}>Legs {fmt(values.legs, 1)}%</span>
        <span className={`absolute right-0 bottom-4 ${chipClass}`}>Legs {fmt(values.legs, 1)}%</span>
      </div>
      <p className="mt-1 text-center text-xs font-medium">Total: {fmt(values.total, 1)}%</p>
    </div>
  );
}

function ScaleBar({
  label,
  value,
  unit,
  min,
  max,
  tone = "slate",
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  tone?: "slate" | "rose" | "emerald" | "amber";
}) {
  const left = clampPercent(value, min, max);
  const toneClass =
    tone === "rose"
      ? "bg-rose-500"
      : tone === "emerald"
        ? "bg-emerald-500"
        : tone === "amber"
          ? "bg-amber-500"
          : "bg-slate-700";

  return (
    <div className="rounded-lg border border-slate-300 p-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <p className="text-xs font-medium text-slate-700">
          {fmt(value, 1)} {unit}
        </p>
      </div>
      <div className="relative h-3 rounded bg-slate-100">
        <div className="absolute inset-y-0 left-1/3 w-px bg-slate-300" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-slate-300" />
        <div className={`absolute top-0 h-3 w-1 rounded ${toneClass}`} style={{ left: `${left}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { scanId } = await params;
  const { pdf } = await searchParams;
  const isPdfMode = pdf === "1";

  if (!uuidPattern.test(scanId)) notFound();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("scans")
    .select("*, patients!inner(id,hn_number,name,age,sex,height_cm,created_at)")
    .eq("id", scanId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const scan = data as ScanWithPatient;
  const patient = scan.patients;

  const { data: historyData } = await supabase
    .from("scans")
    .select("scan_date,weight_kg,skeletal_muscle_total_kg,body_fat_percent")
    .eq("patient_id", scan.patient_id)
    .order("scan_date", { ascending: true })
    .limit(8);

  const history = historyData ?? [];
  const historyRows = isPdfMode ? history.slice(-3) : history.slice(-8);

  async function saveReportNoteAction(formData: FormData) {
    "use server";

    const scanIdValue = formData.get("scan_id");
    const noteValue = formData.get("report_note");

    if (typeof scanIdValue !== "string" || scanIdValue !== scan.id) {
      throw new Error("Invalid scan_id.");
    }

    const report_note = typeof noteValue === "string" ? noteValue.trim() : "";
    const supabaseAction = createSupabaseServerClient();
    const { error: updateError } = await supabaseAction
      .from("scans")
      .update({ report_note: report_note || null })
      .eq("id", scan.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(`/report/${scan.id}`);
  }

  const shellClass = isPdfMode ? "min-h-screen bg-white p-0" : "min-h-screen bg-slate-100 p-4 md:p-6";
  const wrapperClass = isPdfMode
    ? "a4-page mx-auto bg-white p-2 text-slate-900"
    : "mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl";

  return (
    <main className={shellClass}>
      <div className={`mx-auto mb-4 flex max-w-7xl items-center justify-between ${isPdfMode ? "hidden" : ""}`}>
        <Link href={`/patients/${scan.patient_id}`} className="text-sm text-slate-600 hover:text-slate-900">
          Back to Patient
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">Report Viewer</span>
          <a
            href={`/api/generate-pdf?scanId=${scan.id}`}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Download PDF
          </a>
        </div>
      </div>

      <article className={wrapperClass}>
        <header className="overflow-hidden rounded-xl border border-slate-300">
          <div
            className={`flex items-end justify-between border-b border-slate-300 bg-gradient-to-r from-teal-700 to-cyan-700 text-white ${
              isPdfMode ? "px-4 py-3" : "px-3 py-2"
            }`}
          >
            <h1 className={isPdfMode ? "text-3xl font-bold leading-none" : "text-2xl font-bold leading-none"}>Erika Clinic</h1>
            <div className="text-right">
              <p className="text-lg font-semibold leading-none">Body Composition Report</p>
              <p className="text-xs text-cyan-100">erika-clinic.local</p>
            </div>
          </div>

          <div className={isPdfMode ? "grid grid-cols-3 text-sm md:grid-cols-6" : "grid grid-cols-2 text-sm md:grid-cols-3 xl:grid-cols-6"}>
            <div className={`border-r border-slate-300 px-2 ${isPdfMode ? "py-1.5" : "py-1"}`}>
              <p className="text-slate-500">Patient Name</p>
              <p className="font-medium">{patient.name}</p>
            </div>
            <div className={`border-r border-slate-300 px-2 ${isPdfMode ? "py-1.5" : "py-1"}`}>
              <p className="text-slate-500">HN Number</p>
              <p className="font-medium">{patient.hn_number}</p>
            </div>
            <div className={`border-r border-slate-300 px-2 ${isPdfMode ? "py-1.5" : "py-1"}`}>
              <p className="text-slate-500">Age</p>
              <p className="font-medium">{patient.age}</p>
            </div>
            <div className={`border-r border-slate-300 px-2 ${isPdfMode ? "py-1.5" : "py-1"}`}>
              <p className="text-slate-500">Gender</p>
              <p className="font-medium">{patient.sex}</p>
            </div>
            <div className={`border-r border-slate-300 px-2 ${isPdfMode ? "py-1.5" : "py-1"}`}>
              <p className="text-slate-500">Height</p>
              <p className="font-medium">{fmt(patient.height_cm, 1)} cm</p>
            </div>
            <div className={`px-2 ${isPdfMode ? "py-1.5" : "py-1"}`}>
              <p className="text-slate-500">Test Date & Time</p>
              <p className="font-medium">
                {new Date(scan.scan_date).toLocaleString("en-GB", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </header>

        {isPdfMode ? (
          <div className="mt-2 grid grid-cols-[1.05fr_0.95fr] gap-2 text-[11px]">
            <section className="col-span-2 grid grid-cols-4 gap-1.5">
              <div className="rounded-lg border border-slate-300 p-1.5">
                <p className="text-xs font-semibold text-slate-700">Weight</p>
                <p className="text-xl font-semibold text-slate-900">{fmt(scan.weight_kg)} kg</p>
              </div>
              <div className="rounded-lg border border-slate-300 p-1.5">
                <p className="text-xs font-semibold text-slate-700">Body Fat %</p>
                <p className="text-xl font-semibold text-slate-900">{fmt(scan.body_fat_percent)}%</p>
              </div>
              <div className="rounded-lg border border-slate-300 p-1.5">
                <p className="text-xs font-semibold text-slate-700">Skeletal %</p>
                <p className="text-xl font-semibold text-slate-900">{fmt(scan.skeletal_muscle_total_percent)}%</p>
              </div>
              <div className="rounded-lg border border-slate-300 p-1.5">
                <p className="text-xs font-semibold text-slate-700">Visceral Fat</p>
                <p className="text-xl font-semibold text-slate-900">{scan.visceral_fat_level}</p>
              </div>
            </section>

            <section className="col-span-2 grid grid-cols-5 gap-1.5">
              <ScaleBar label="Weight" value={scan.weight_kg} unit="kg" min={35} max={150} tone="slate" />
              <ScaleBar label="BMI" value={scan.bmi} unit="" min={10} max={45} tone="amber" />
              <ScaleBar label="Visceral Fat" value={scan.visceral_fat_level} unit="" min={1} max={20} tone="rose" />
              <ScaleBar label="Body Fat %" value={scan.body_fat_percent} unit="%" min={5} max={55} tone="rose" />
              <ScaleBar label="Body Age" value={scan.body_age_years} unit="yr" min={10} max={90} tone="emerald" />
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-300">
                <h2 className="bg-slate-100 px-2 py-1 text-base font-semibold text-slate-700">Body Region Infographic</h2>
              <div className="grid grid-cols-2 gap-1 p-1.5">
                <BodyFigure
                  title="Skeletal Muscle"
                  tone="muscle"
                  size="md"
                  values={{
                    arms: scan.skeletal_muscle_arms_percent,
                    trunk: scan.skeletal_muscle_trunk_percent,
                    legs: scan.skeletal_muscle_legs_percent,
                    total: scan.skeletal_muscle_total_percent,
                  }}
                />
                <BodyFigure
                  title="Subcutaneous Fat"
                  tone="fat"
                  size="md"
                  values={{
                    arms: scan.subcutaneous_fat_arms_percent,
                    trunk: scan.subcutaneous_fat_trunk_percent,
                    legs: scan.subcutaneous_fat_legs_percent,
                    total: scan.subcutaneous_fat_total_percent,
                  }}
                />
              </div>
            </section>

            <section className="space-y-1.5">
              <div className="overflow-hidden rounded-lg border border-slate-300">
                <h2 className="bg-slate-100 px-2 py-1 text-base font-semibold text-slate-700">Recorded Metrics</h2>
                <table className="w-full">
                  <tbody>
                    <tr className="border-t border-slate-200"><td className="px-2 py-0.5">BMI</td><td className="px-2 py-0.5 text-right">{fmt(scan.bmi)}</td></tr>
                    <tr className="border-t border-slate-200"><td className="px-2 py-0.5">Body Fat (kg)</td><td className="px-2 py-0.5 text-right">{fmt(scan.body_fat_kg)} kg</td></tr>
                    <tr className="border-t border-slate-200"><td className="px-2 py-0.5">Skeletal Muscle (kg)</td><td className="px-2 py-0.5 text-right">{fmt(scan.skeletal_muscle_total_kg)} kg</td></tr>
                    <tr className="border-t border-slate-200"><td className="px-2 py-0.5">Resting Metabolism</td><td className="px-2 py-0.5 text-right">{scan.resting_metabolism_kcal} kcal</td></tr>
                    <tr className="border-t border-slate-200"><td className="px-2 py-0.5">Body Age</td><td className="px-2 py-0.5 text-right">{scan.body_age_years}</td></tr>
                    <tr className="border-t border-slate-200"><td className="px-2 py-0.5">TBW / Protein / Minerals</td><td className="px-2 py-0.5 text-right">{fmt(scan.total_body_water_l)} / {fmt(scan.protein_kg)} / {fmt(scan.minerals_kg)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border border-slate-300 p-2">
                <h3 className="text-base font-semibold text-slate-700">Notes</h3>
                <div className="mt-1 min-h-20 max-h-24 overflow-hidden rounded-md border border-slate-300 bg-slate-50 px-2 py-1 whitespace-pre-wrap">
                  {scan.report_note?.trim() ? scan.report_note : "No note."}
                </div>
              </div>
            </section>

            <section className="col-span-2 overflow-hidden rounded-lg border border-slate-300">
                <h2 className="bg-slate-100 px-2 py-1 text-base font-semibold text-slate-700">Body Composition History</h2>
              <table className="w-full">
                <thead>
                  <tr className="border-t border-slate-200 bg-slate-50">
                    <th className="px-2 py-0.5 text-left">Date</th>
                    <th className="px-2 py-0.5 text-right">Weight</th>
                    <th className="px-2 py-0.5 text-right">SMM</th>
                    <th className="px-2 py-0.5 text-right">PBF</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-1 text-center text-slate-500">No history</td></tr>
                  ) : (
                    historyRows.map((h) => (
                      <tr key={h.scan_date} className="border-t border-slate-200">
                        <td className="px-2 py-0.5">{new Date(h.scan_date).toLocaleDateString("en-GB")}</td>
                        <td className="px-2 py-0.5 text-right">{fmt(h.weight_kg, 1)}</td>
                        <td className="px-2 py-0.5 text-right">{fmt(h.skeletal_muscle_total_kg, 1)}</td>
                        <td className="px-2 py-0.5 text-right">{fmt(h.body_fat_percent, 1)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-300 p-3">
                <h3 className="text-sm font-semibold text-slate-700">Core</h3>
                <div className="mt-2 grid grid-cols-2 gap-y-1">
                  <p className="text-slate-600">Weight</p><p className="text-right">{fmt(scan.weight_kg)} kg</p>
                  <p className="text-slate-600">BMI</p><p className="text-right">{fmt(scan.bmi)}</p>
                  <p className="text-slate-600">Body Fat %</p><p className="text-right">{fmt(scan.body_fat_percent)}%</p>
                  <p className="text-slate-600">Body Fat kg</p><p className="text-right">{fmt(scan.body_fat_kg)} kg</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-300 p-3">
                <h3 className="text-sm font-semibold text-slate-700">Muscle</h3>
                <div className="mt-2 grid grid-cols-2 gap-y-1">
                  <p className="text-slate-600">Skeletal %</p><p className="text-right">{fmt(scan.skeletal_muscle_total_percent)}%</p>
                  <p className="text-slate-600">Skeletal kg</p><p className="text-right">{fmt(scan.skeletal_muscle_total_kg)} kg</p>
                  <p className="text-slate-600">Visceral Fat</p><p className="text-right">{scan.visceral_fat_level}</p>
                  <p className="text-slate-600">Body Age</p><p className="text-right">{scan.body_age_years}</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-300 p-3">
                <h3 className="text-sm font-semibold text-slate-700">Clinical</h3>
                <div className="mt-2 grid grid-cols-2 gap-y-1">
                  <p className="text-slate-600">TBW</p><p className="text-right">{fmt(scan.total_body_water_l)} L</p>
                  <p className="text-slate-600">Protein</p><p className="text-right">{fmt(scan.protein_kg)} kg</p>
                  <p className="text-slate-600">Minerals</p><p className="text-right">{fmt(scan.minerals_kg)} kg</p>
                  <p className="text-slate-600">RMR</p><p className="text-right">{scan.resting_metabolism_kcal} kcal</p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-300 p-3">
                <h3 className="text-sm font-semibold text-slate-700">Scan</h3>
                <div className="mt-2 space-y-1 text-slate-700">
                  <p>Date: {new Date(scan.scan_date).toLocaleDateString("en-GB")}</p>
                  <p>Time: {new Date(scan.scan_date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <ScaleBar label="Weight" value={scan.weight_kg} unit="kg" min={35} max={150} tone="slate" />
              <ScaleBar label="BMI" value={scan.bmi} unit="" min={10} max={45} tone="amber" />
              <ScaleBar label="Visceral Fat" value={scan.visceral_fat_level} unit="" min={1} max={20} tone="rose" />
              <ScaleBar label="Body Fat %" value={scan.body_fat_percent} unit="%" min={5} max={55} tone="rose" />
              <ScaleBar label="Body Age" value={scan.body_age_years} unit="yr" min={10} max={90} tone="emerald" />
            </section>

            <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-slate-300">
                <h2 className="bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700">Skeletal Muscle Breakdown</h2>
                <BodyFigure
                  title="Region Distribution"
                  tone="muscle"
                  size="md"
                  values={{
                    arms: scan.skeletal_muscle_arms_percent,
                    trunk: scan.skeletal_muscle_trunk_percent,
                    legs: scan.skeletal_muscle_legs_percent,
                    total: scan.skeletal_muscle_total_percent,
                  }}
                />
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-300">
                <h2 className="bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700">Subcutaneous Fat Breakdown</h2>
                <BodyFigure
                  title="Region Distribution"
                  tone="fat"
                  size="md"
                  values={{
                    arms: scan.subcutaneous_fat_arms_percent,
                    trunk: scan.subcutaneous_fat_trunk_percent,
                    legs: scan.subcutaneous_fat_legs_percent,
                    total: scan.subcutaneous_fat_total_percent,
                  }}
                />
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-lg border border-slate-300">
                <h2 className="bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700">Body Composition History</h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-right">Weight</th>
                      <th className="px-2 py-1 text-right">SMM</th>
                      <th className="px-2 py-1 text-right">PBF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.length === 0 ? (
                      <tr><td colSpan={4} className="px-2 py-2 text-center text-slate-500">No history</td></tr>
                    ) : (
                      historyRows.map((h) => (
                        <tr key={h.scan_date} className="border-t border-slate-200">
                          <td className="px-2 py-1">{new Date(h.scan_date).toLocaleDateString("en-GB")}</td>
                          <td className="px-2 py-1 text-right">{fmt(h.weight_kg, 1)}</td>
                          <td className="px-2 py-1 text-right">{fmt(h.skeletal_muscle_total_kg, 1)}</td>
                          <td className="px-2 py-1 text-right">{fmt(h.body_fat_percent, 1)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <section className="rounded-lg border border-slate-300 p-3">
                <h3 className="text-base font-semibold text-slate-700">Notes</h3>
                <form action={saveReportNoteAction} className="mt-2 space-y-2">
                  <input type="hidden" name="scan_id" value={scan.id} />
                  <textarea
                    name="report_note"
                    defaultValue={scan.report_note ?? ""}
                    placeholder="Add note for this report..."
                    className="h-44 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Save Note
                  </button>
                </form>
              </section>
            </section>
          </div>
        )}
      </article>
    </main>
  );
}
