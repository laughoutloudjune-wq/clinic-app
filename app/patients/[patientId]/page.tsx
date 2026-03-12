import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PatientHistoryChart from "@/components/charts/patient-history-chart";
import DeletePatientButton from "@/components/patients/delete-patient-button";
import DeleteScanButton from "@/components/scans/delete-scan-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Patient, Scan } from "@/types/database";

type PageProps = {
  params: Promise<{
    patientId: string;
  }>;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PatientDetailPage({ params }: PageProps) {
  const { patientId } = await params;
  if (!uuidPattern.test(patientId)) {
    notFound();
  }

  const supabase = createSupabaseServerClient();

  const [{ data: patient, error: patientError }, { data: scansData, error: scansError }] = await Promise.all([
    supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
    supabase.from("scans").select("*").eq("patient_id", patientId).order("scan_date", { ascending: true }),
  ]);

  if (patientError) throw new Error(patientError.message);
  if (scansError) throw new Error(scansError.message);
  if (!patient) notFound();

  const typedPatient = patient as Patient;
  const scans = (scansData ?? []) as Scan[];

  async function deletePatientAction(formData: FormData) {
    "use server";

    const patientIdValue = formData.get("patient_id");
    if (typeof patientIdValue !== "string" || patientIdValue !== typedPatient.id) {
      throw new Error("Invalid patient id.");
    }

    const supabaseAction = createSupabaseServerClient();
    const { error: deleteError } = await supabaseAction.from("patients").delete().eq("id", typedPatient.id);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    redirect("/");
  }

  async function deleteScanAction(formData: FormData) {
    "use server";

    const scanIdValue = formData.get("scan_id");
    if (typeof scanIdValue !== "string") {
      throw new Error("Invalid scan id.");
    }

    const supabaseAction = createSupabaseServerClient();
    const { error: deleteError } = await supabaseAction
      .from("scans")
      .delete()
      .eq("id", scanIdValue)
      .eq("patient_id", typedPatient.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{typedPatient.name}</h1>
              <p className="mt-1 text-sm text-slate-600">
                HN: {typedPatient.hn_number} | Age: {typedPatient.age} | Sex: {typedPatient.sex} | Height: {typedPatient.height_cm} cm
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Dashboard
              </Link>
              <Link
                href={`/patients/${typedPatient.id}/scans/new`}
                className="rounded border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Add New Scan
              </Link>
              <DeletePatientButton
                patientId={typedPatient.id}
                patientName={typedPatient.name}
                onDeleteAction={deletePatientAction}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Historical Trends</h2>
          <p className="mt-1 text-sm text-slate-600">Weight, Body Fat %, and Skeletal Muscle kg comparison over time.</p>
          {scans.length > 0 ? (
            <div className="mt-4">
              <PatientHistoryChart data={scans} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No scans yet.</p>
          )}
        </section>

        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Scan Date</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">Body Fat %</th>
                <th className="px-4 py-3 font-medium">Skeletal Muscle kg</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...scans].reverse().map((scan) => (
                <tr key={scan.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    {new Date(scan.scan_date).toLocaleString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{scan.weight_kg}</td>
                  <td className="px-4 py-3">{scan.body_fat_percent}</td>
                  <td className="px-4 py-3">{scan.skeletal_muscle_total_kg}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/report/${scan.id}`} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
                        View Report
                      </Link>
                      <Link
                        href={`/patients/${typedPatient.id}/scans/${scan.id}/edit`}
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                      >
                        Edit Scan
                      </Link>
                      <a
                        href={`/api/generate-pdf?scanId=${scan.id}`}
                        className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Download PDF
                      </a>
                      <DeleteScanButton scanId={scan.id} onDeleteAction={deleteScanAction} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
