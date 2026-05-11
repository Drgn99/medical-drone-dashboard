import dynamic from "next/dynamic";
import type { LatLng } from "./LocationPicker";

const LocationPickerDynamic = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[340px] animate-pulse rounded-lg border border-input bg-slate-100" />
  ),
});

export { LocationPickerDynamic };
export type { LatLng };
