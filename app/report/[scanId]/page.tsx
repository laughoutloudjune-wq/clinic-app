import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import AutoPrint from "@/components/report/auto-print";
import ReportActions from "@/components/report/report-actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Patient, Scan } from "@/types/database";

type PageProps = {
  params: Promise<{
    scanId: string;
  }>;
  searchParams: Promise<{
    pdf?: string;
    autoprint?: string;
  }>;
};

type ScanWithPatient = Scan & {
  patients: Pick<Patient, "id" | "hn_number" | "name" | "age" | "sex" | "height_cm">;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "-";
  return value.toFixed(digits);
}

function clampPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const ratio = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, ratio));
}

function ScaleMeter({
  label,
  value,
  unit,
  min,
  max,
  compact = false,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  compact?: boolean;
}) {
  const span = Math.max(0.1, max - min);
  const extendedMin = min - span * 0.6;
  const extendedMax = max + span * 0.6;
  const left = clampPercent(value, extendedMin, extendedMax);

  return (
    <div className={`rounded-lg border border-slate-300 ${compact ? "p-2" : "p-2"}`}>
      <div className="mb-1 flex items-center justify-between">
        <p className={`${compact ? "text-sm" : "text-xs"} font-semibold text-slate-700`}>{label}</p>
        <p className={`${compact ? "text-sm" : "text-xs"} font-medium text-slate-700`}>
          {fmt(value, 1)} {unit}
        </p>
      </div>
      <div className="relative h-3 overflow-hidden rounded border border-slate-200 bg-slate-100">
        <div className="absolute inset-y-0 left-0 w-[30%] bg-sky-100" />
        <div className="absolute inset-y-0 left-[30%] w-[40%] bg-emerald-100" />
        <div className="absolute inset-y-0 left-[70%] w-[30%] bg-rose-100" />
        <div className="absolute inset-y-0 left-[30%] w-px bg-slate-300" />
        <div className="absolute inset-y-0 left-[70%] w-px bg-slate-300" />
        <div className="absolute top-[-1px] h-4 w-2 rounded bg-black" style={{ left: `${left}%` }} />
      </div>
      <div className={`mt-1 flex items-center justify-between gap-2 ${compact ? "text-xs" : "text-[10px]"} text-slate-500`}>
        <span>Low</span>
        <span>Normal: {fmt(min, 1)}-{fmt(max, 1)} {unit}</span>
        <span>High</span>
      </div>
    </div>
  );
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { scanId } = await params;
  const { pdf, autoprint } = await searchParams;
  const isPdfMode = pdf === "1";
  const shouldAutoPrint = isPdfMode && autoprint === "1";

  if (!uuidPattern.test(scanId)) notFound();

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("scans")
    .select("*, patients!inner(id,hn_number,name,age,sex,height_cm)")
    .eq("id", scanId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const scan = data as ScanWithPatient;
  const patient = scan.patients;
  const heightM = patient.height_cm > 0 ? patient.height_cm / 100 : 0;
  const normalWeightMin = heightM > 0 ? 18.5 * heightM * heightM : 0;
  const normalWeightMax = heightM > 0 ? 24.9 * heightM * heightM : 0;
  const bodyFatRange =
    patient.sex === "Male"
      ? { min: 10, max: 20 }
      : patient.sex === "Female"
        ? { min: 18, max: 28 }
        : { min: 14, max: 25 };

  const { data: historyData } = await supabase
    .from("scans")
    .select("scan_date,weight_kg,skeletal_muscle_total_kg,body_fat_percent")
    .eq("patient_id", scan.patient_id)
    .order("scan_date", { ascending: true })
    .limit(8);

  const historyRows = (historyData ?? []).slice(isPdfMode ? -3 : -8);

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

    if (updateError) throw new Error(updateError.message);
    revalidatePath(`/report/${scan.id}`);
  }

  const shellClass = isPdfMode ? "min-h-screen bg-white p-0" : "min-h-screen bg-slate-100 p-4 md:p-6";
  const wrapperClass = isPdfMode
    ? "a4-page pdf-compact mx-auto bg-white p-2 text-slate-900"
    : "mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl";
  const scaleGridClass = "grid grid-cols-1 gap-2";

  return (
    <main className={shellClass}>
      {shouldAutoPrint ? <AutoPrint /> : null}
      {!isPdfMode ? (
        <div className="mx-auto mb-4 flex max-w-7xl items-center justify-between print:hidden">
          <Link href={`/patients/${scan.patient_id}`} className="text-sm text-slate-600 hover:text-slate-900">
            Back to Patient
          </Link>
          <ReportActions scanId={scan.id} />
        </div>
      ) : null}

      <article className={wrapperClass}>
        <header className="overflow-hidden rounded-xl border border-slate-300">
          <div
            className="flex items-end justify-between border-b border-slate-300 px-4 py-3 text-white"
            style={{ background: "linear-gradient(90deg, #5f6d43 0%, #889866 52%, #a6b083 100%)" }}
          >
            <div className="flex items-center gap-3">
              <Image
                src="/erika-clinic-logo.png"
                alt="Erika Clinic Logo"
                width={isPdfMode ? 58 : 64}
                height={isPdfMode ? 58 : 64}
                className="h-14 w-14 rounded-full bg-white/95 object-contain p-1"
                priority
              />
              <h1 className={isPdfMode ? "text-2xl font-bold leading-none" : "text-2xl font-bold leading-none"}>Erika Clinic</h1>
            </div>
            <div className="text-right">
              <p className={isPdfMode ? "text-base font-semibold leading-none" : "text-lg font-semibold leading-none"}>
                Body Composition Dashboard Report
              </p>
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

        <div className={isPdfMode ? "mt-2 space-y-2 text-sm" : "mt-3 space-y-3 text-sm"}>
          <section className={scaleGridClass}>
            <ScaleMeter
              label="Weight"
              value={scan.weight_kg}
              unit="kg"
              min={Number(normalWeightMin.toFixed(1))}
              max={Number(normalWeightMax.toFixed(1))}
              compact={isPdfMode}
            />
            <ScaleMeter label="BMI" value={scan.bmi} unit="" min={18.5} max={24.9} compact={isPdfMode} />
            <ScaleMeter label="Visceral Fat" value={scan.visceral_fat_level} unit="" min={1} max={9} compact={isPdfMode} />
            <ScaleMeter
              label="Body Fat %"
              value={scan.body_fat_percent}
              unit="%"
              min={bodyFatRange.min}
              max={bodyFatRange.max}
              compact={isPdfMode}
            />
          </section>

          <section className={isPdfMode ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-3 lg:grid-cols-2"}>
            <div className="overflow-hidden rounded-lg border border-slate-300">
              <h2 className="bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700">Skeletal Muscle Breakdown</h2>
              <table className="w-full">
                <tbody>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Arms (%)</td><td className="px-2 py-1 text-right">{fmt(scan.skeletal_muscle_arms_percent)}%</td></tr>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Trunk (%)</td><td className="px-2 py-1 text-right">{fmt(scan.skeletal_muscle_trunk_percent)}%</td></tr>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Legs (%)</td><td className="px-2 py-1 text-right">{fmt(scan.skeletal_muscle_legs_percent)}%</td></tr>
                  <tr className="border-t border-slate-200 bg-slate-50 font-medium"><td className="px-2 py-1">Total (%)</td><td className="px-2 py-1 text-right">{fmt(scan.skeletal_muscle_total_percent)}%</td></tr>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Skeletal Muscle Total (kg)</td><td className="px-2 py-1 text-right">{fmt(scan.skeletal_muscle_total_kg)} kg</td></tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-300">
              <h2 className="bg-slate-100 px-3 py-2 text-base font-semibold text-slate-700">Subcutaneous Fat Breakdown</h2>
              <table className="w-full">
                <tbody>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Arms (%)</td><td className="px-2 py-1 text-right">{fmt(scan.subcutaneous_fat_arms_percent)}%</td></tr>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Trunk (%)</td><td className="px-2 py-1 text-right">{fmt(scan.subcutaneous_fat_trunk_percent)}%</td></tr>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Legs (%)</td><td className="px-2 py-1 text-right">{fmt(scan.subcutaneous_fat_legs_percent)}%</td></tr>
                  <tr className="border-t border-slate-200 bg-slate-50 font-medium"><td className="px-2 py-1">Total (%)</td><td className="px-2 py-1 text-right">{fmt(scan.subcutaneous_fat_total_percent)}%</td></tr>
                  <tr className="border-t border-slate-200"><td className="px-2 py-1">Body Fat (kg)</td><td className="px-2 py-1 text-right">{fmt(scan.body_fat_kg)} kg</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={isPdfMode ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr_0.8fr]"}>
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

            <div className={isPdfMode ? "grid grid-cols-1 gap-2" : "space-y-3"}>
              <section className={isPdfMode ? "rounded-lg border border-slate-300 p-2" : "rounded-lg border border-slate-300 p-3"}>
                <h3 className="text-base font-semibold text-slate-700">Additional Data</h3>
                <div className="mt-2 grid grid-cols-2 gap-y-1">
                  <p className="text-slate-600">Resting Metabolism (kcal)</p><p className="text-right font-medium">{scan.resting_metabolism_kcal}</p>
                  <p className="text-slate-600">Body Age (years)</p><p className="text-right font-medium">{scan.body_age_years}</p>
                </div>
              </section>

              <section className={isPdfMode ? "rounded-lg border border-slate-300 p-2" : "rounded-lg border border-slate-300 p-3"}>
                <h3 className="text-base font-semibold text-slate-700">Notes</h3>
                {isPdfMode ? (
                  <div className="mt-1 min-h-16 max-h-16 overflow-hidden rounded-md border border-slate-300 bg-slate-50 px-2 py-1 whitespace-pre-wrap">
                    {scan.report_note?.trim() ? scan.report_note : "No note."}
                  </div>
                ) : (
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
                )}
              </section>
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
