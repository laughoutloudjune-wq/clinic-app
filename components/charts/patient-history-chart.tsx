"use client";

import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

type HistoryPoint = {
  scan_date: string;
  weight_kg: number;
  body_fat_kg?: number;
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

type MetricConfig = {
  key: keyof HistoryPoint;
  label: string;
  unit: string;
  color: string;
  decimals: number;
};

export default function PatientHistoryChart({ data }: PatientHistoryChartProps) {
  const minChartWidth = Math.max(560, data.length * 90);
  const metrics: MetricConfig[] = [
    { key: "weight_kg", label: "Weight", unit: "kg", color: "#111827", decimals: 1 },
    { key: "skeletal_muscle_total_kg", label: "Skeletal Muscle Mass", unit: "kg", color: "#374151", decimals: 1 },
    { key: "body_fat_kg", label: "Body Fat Mass", unit: "kg", color: "#4b5563", decimals: 1 },
    { key: "body_fat_percent", label: "Percent Body Fat", unit: "%", color: "#6b7280", decimals: 1 },
  ];

  const labelFormatter = (value: unknown, decimals: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return "";
    return value.toFixed(decimals);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]" style={{ width: `${Math.max(760, minChartWidth + 160)}px` }}>
          {metrics.map((metric, index) => (
            <div key={metric.key as string} className="grid grid-cols-[160px_1fr] border-b border-slate-300 last:border-b-0">
              <div className="flex items-center justify-between bg-slate-200 px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{metric.label}</p>
                <p className="text-xs font-semibold text-slate-600">({metric.unit})</p>
              </div>
              <div className="h-22 bg-white px-2 py-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 14, right: 8, left: 8, bottom: index === metrics.length - 1 ? 14 : 6 }}>
                    <CartesianGrid vertical stroke="#d1d5db" horizontal={false} />
                    <XAxis
                      dataKey="scan_date"
                      tickFormatter={index === metrics.length - 1 ? formatDate : undefined}
                      hide={index !== metrics.length - 1}
                      minTickGap={22}
                      stroke="#6b7280"
                      fontSize={11}
                    />
                    <YAxis hide domain={["dataMin - 0.4", "dataMax + 0.4"]} />
                    <Line
                      type="monotone"
                      dataKey={metric.key}
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "#111111", stroke: "#111111" }}
                      connectNulls
                    >
                      <LabelList
                        dataKey={metric.key}
                        position="top"
                        offset={6}
                        fill="#374151"
                        fontSize={11}
                        formatter={(value: unknown) => labelFormatter(value, metric.decimals)}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
