"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ReportAnalysisBarsProps {
  weightKg: number;
  bodyFatKg: number;
  skeletalMuscleKg: number;
}

export default function ReportAnalysisBars({ weightKg, bodyFatKg, skeletalMuscleKg }: ReportAnalysisBarsProps) {
  const data = [
    { metric: "Weight (kg)", value: weightKg },
    { metric: "Body Fat (kg)", value: bodyFatKg },
    { metric: "Skeletal Muscle (kg)", value: skeletalMuscleKg },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="metric" width={120} />
          <Tooltip />
          <Bar dataKey="value" fill="#0f172a" radius={[2, 2, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
