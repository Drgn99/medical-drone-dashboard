"use client";

import dynamic from "next/dynamic";

export const LiveDroneMapDynamic = dynamic(
  () => import("@/components/LiveDroneMap"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-xl bg-slate-100 h-[250px] sm:h-[400px]" />
    ),
  }
);
