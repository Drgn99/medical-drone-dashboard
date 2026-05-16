"use client";

import {
  LineChart,
  Line,
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
  date: string; // "May 1", "May 2" etc.
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
};

// ── Components ──────────────────────────────────────────────────────────────

export function OrdersOverTimeChart({ data }: { data: DailyCount[] }) {
  return (
    <AnalyticsChartCard title="Orders Over Time">
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Orders"
            />
          </LineChart>
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
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={false}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
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
                  <span className="text-xs text-slate-700">
                    {value} ({slice?.value ?? 0})
                  </span>
                );
              }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            {/* Center label */}
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-900 text-2xl font-bold"
              style={{ fontSize: 24, fontWeight: 700 }}
            >
              {total}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-500 text-xs"
              style={{ fontSize: 11 }}
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
            <Bar dataKey="deliveries" fill="#3b82f6" radius={[0, 4, 4, 0]}>
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
