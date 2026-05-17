import { format, formatDistanceToNow } from "date-fns";

/**
 * Full timestamp with relative time, e.g. "May 13, 14:30 (4 days ago)"
 */
export function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${format(d, "MMM d, HH:mm")} (${formatDistanceToNow(d, { addSuffix: true })})`;
}

/**
 * Compact timestamp, e.g. "May 13, 14:30"
 */
export function formatShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "MMM d, HH:mm");
}
