"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const selectClass =
  "rounded-lg border border-input bg-white px-2.5 py-1.5 text-sm outline-none focus:border-ring transition-colors cursor-pointer";

export function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/dashboard/orders?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className={selectClass}
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="all">All statuses</option>
        <option value="pending">Pending</option>
        <option value="dispatched">In Progress</option>
        <option value="in_flight">In Progress (En Route)</option>
        <option value="arrived">In Progress (Arrived)</option>
        <option value="delivered">Delivered</option>
        <option value="returned">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select
        className={selectClass}
        value={searchParams.get("range") ?? "all"}
        onChange={(e) => update("range", e.target.value)}
      >
        <option value="all">All time</option>
        <option value="today">Today</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </select>
    </div>
  );
}
