"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { AnalyticsChartCard } from "@/components/AnalyticsChartCard";

// ── Types ───────────────────────────────────────────────────────────────────

export interface DailyCount {
  date: string;
  count: number;
}

export interface StatusSlice {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface DroneBar {
  name: string;
  deliveries: number;
}

// Colors are now passed in via data[].color from src/lib/status.ts

// ── Components ──────────────────────────────────────────────────────────────

export function OrdersOverTimeChart({ data }: { data: DailyCount[] }) {
  return (
    <AnalyticsChartCard title="Orders Over Time">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2563eb"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={0.1}
              dot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
              name="Orders"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsChartCard>
  );
}

export function OrdersByStatusChart({
  data,
  total,
}: {
  data: StatusSlice[];
  total: number;
}) {
  return (
    <AnalyticsChartCard title="Orders by Status">
      <div style={{ height: 280 }} className="flex items-center">
        <div className="flex-1" style={{ height: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
                label={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              {/* Center label */}
              <text
                x="50%"
                y="46%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 28, fontWeight: 600, fill: "#0f172a" }}
              >
                {total}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: 11, fill: "#64748b" }}
              >
                total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Custom legend with explicit colors */}
        <div className="flex flex-col gap-1.5 pr-2">
          {data.map((entry) => (
            <div key={entry.status} className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-slate-700">
                {entry.label} ({entry.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </AnalyticsChartCard>
  );
}

export function DroneUtilizationChart({ data }: { data: DroneBar[] }) {
  const height = Math.max(160, data.length * 40 + 40);

  return (
    <AnalyticsChartCard title="Drone Utilization (Deliveries, Last 30 Days)">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 40, bottom: 4, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="deliveries" fill="#2563eb" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="deliveries"
                position="right"
                style={{ fontSize: 11, fill: "#475569" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsChartCard>
  );
}

