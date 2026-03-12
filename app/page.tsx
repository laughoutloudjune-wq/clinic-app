import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Patient } from "@/types/database";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { q = "" } = await searchParams;
  const supabase = createSupabaseServerClient();
  const query = q.trim();

  let patientsQuery = supabase
    .from("patients")
    .select("id,hn_number,name,age,sex,height_cm,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (query) {
    patientsQuery = patientsQuery.or(`name.ilike.%${query}%,hn_number.ilike.%${query}%`);
  }

  const { data, error } = await patientsQuery;
  if (error) {
    throw new Error(error.message);
  }

  const patients = (data ?? []) as Patient[];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Patient Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">Search by patient name or HN number.</p>
            </div>
            <Link
              href="/patients/new"
              className="inline-flex rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add New Patient
            </Link>
          </div>

          <form className="mt-4 flex flex-col gap-3 md:flex-row" method="get">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search name or HN number"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Search
            </button>
          </form>
        </section>

        <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-[760px] text-left text-sm md:min-w-full">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">HN Number</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Sex</th>
                <th className="px-4 py-3 font-medium">Height (cm)</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">{patient.hn_number}</td>
                  <td className="px-4 py-3">{patient.name}</td>
                  <td className="px-4 py-3">{patient.age}</td>
                  <td className="px-4 py-3">{patient.sex}</td>
                  <td className="px-4 py-3">{patient.height_cm}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/patients/${patient.id}`} className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100">
                        View History
                      </Link>
                      <Link
                        href={`/patients/${patient.id}/scans/new`}
                        className="rounded border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        Add Scan
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No patients found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
