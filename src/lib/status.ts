export interface StatusGroup {
  label: string;
  color: string;
}

/**
 * Maps raw database order status values to display labels and chart colors.
 * "returned" = drone delivered AND returned home safely = SUCCESS.
 * "arrived" = drone at dropoff, waiting for OTP — distinct from in-progress.
 */
export const STATUS_GROUPS: Record<string, StatusGroup> = {
  pending: { label: "Pending", color: "#94a3b8" },
  dispatched: { label: "In Progress", color: "#3b82f6" },
  in_flight: { label: "In Progress", color: "#3b82f6" },
  delivering: { label: "In Progress", color: "#3b82f6" },
  returning: { label: "In Progress", color: "#3b82f6" },
  arrived: { label: "Arrived", color: "#16a34a" },
  delivered: { label: "Delivered", color: "#22c55e" },
  returned: { label: "Completed", color: "#22c55e" },
  cancelled: { label: "Cancelled", color: "#ef4444" },
  failed: { label: "Failed", color: "#dc2626" },
};

export function getStatusLabel(status: string): string {
  return STATUS_GROUPS[status]?.label ?? status;
}

export function getStatusColor(status: string): string {
  return STATUS_GROUPS[status]?.color ?? "#94a3b8";
}
