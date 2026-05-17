"use client";

import dynamic from "next/dynamic";

export const LiveDroneMapDynamic = dynamic(
  () => import("@/components/LiveDroneMap"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-xl bg-slate-100 h-[240px] sm:h-[320px] lg:h-[400px]" />
    ),
  }
);
