import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DroneStatus, OrderStatus } from "@/types/database";

const droneStatusConfig: Record<
  DroneStatus,
  { label: string; className: string }
> = {
  idle: {
    label: "Idle",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  preflight: {
    label: "Preflight",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  in_flight: {
    label: "In Flight",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  delivering: {
    label: "Delivering",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  returning: {
    label: "Returning",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  arrived: {
    label: "Arrived",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  maintenance: {
    label: "Maintenance",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  offline: {
    label: "Offline",
    className: "bg-slate-100 text-slate-500 border-slate-200",
  },
};

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  dispatched: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  in_flight: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  arrived: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  returned: {
    label: "Completed",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export function DroneStatusBadge({ status }: { status: string }) {
  const config =
    droneStatusConfig[status as DroneStatus] ?? droneStatusConfig.offline;
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const config =
    orderStatusConfig[status as OrderStatus] ?? orderStatusConfig.cancelled;
  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
