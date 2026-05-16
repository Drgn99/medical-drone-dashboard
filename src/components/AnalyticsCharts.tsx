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
  Legend,
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
  name: string;
  value: number;
  color: string;
}

export interface DroneBar {
  name: string;
  deliveries: number;
}

// ── Colors ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pending: "#94a3b8",
  Dispatched: "#f59e0b",
  "In Flight": "#3b82f6",
  Delivered: "#22c55e",
  Returned: "#64748b",
  Cancelled: "#ef4444",
  Failed: "#dc2626",
};

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
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="40%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                const slice = data.find((d) => d.name === value);
                return (
                  <span style={{ fontSize: 12, color: "#334155" }}>
                    {value} ({slice?.value ?? 0})
                  </span>
                );
              }}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            {/* Center label */}
            <text
              x="40%"
              y="46%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 28, fontWeight: 600, fill: "#0f172a" }}
            >
              {total}
            </text>
            <text
              x="40%"
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

export { STATUS_COLORS };
