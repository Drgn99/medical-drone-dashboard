"use client";

import { useState, useEffect } from "react";

const timeFmt = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dateFmt = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export function LiveClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-right">
      <p
        className="text-2xl font-semibold tabular-nums text-slate-800"
        suppressHydrationWarning
      >
        {timeFmt.format(now)}
      </p>
      <p className="text-xs text-slate-500" suppressHydrationWarning>
        {dateFmt.format(now)}
      </p>
    </div>
  );
}
