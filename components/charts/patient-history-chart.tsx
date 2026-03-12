"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type HistoryPoint = {
  scan_date: string;
  weight_kg: number;
  body_fat_percent: number;
  skeletal_muscle_total_kg: number;
};

interface PatientHistoryChartProps {
  data: HistoryPoint[];
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

const tooltipLabelFormatter = (label: unknown) => {
  if (typeof label !== "string") return "";
  return formatDate(label);
};

export default function PatientHistoryChart({ data }: PatientHistoryChartProps) {
  const minChartWidth = Math.max(560, data.length * 90);

  return (
    <div className="w-full overflow-x-auto">
      <div className="h-64 min-w-[560px] md:h-80" style={{ width: `${minChartWidth}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 12 }}>
            <XAxis dataKey="scan_date" tickFormatter={formatDate} minTickGap={24} stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Line type="monotone" dataKey="weight_kg" name="Weight (kg)" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="body_fat_percent" name="Body Fat (%)" stroke="#ef4444" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="skeletal_muscle_total_kg"
              name="Skeletal Muscle (kg)"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
