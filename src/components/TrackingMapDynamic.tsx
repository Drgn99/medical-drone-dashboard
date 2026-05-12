"use client";

import dynamic from "next/dynamic";

export const TrackingMapDynamic = dynamic(
  () => import("@/components/TrackingMap"),
  { ssr: false, loading: () => <div style={{ height: 280 }} className="animate-pulse rounded-xl bg-slate-100" /> }
);
