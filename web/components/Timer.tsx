"use client";

import { useEffect, useState } from "react";

export default function Timer({
  endsAt,
  totalSeconds,
  label,
}: {
  endsAt: number | null;
  totalSeconds: number;
  label?: string;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const secondsLeft = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemaining(secondsLeft);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 0;
  const isUrgent = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-5xl font-bold tabular-nums ${
          isUrgent ? "text-red-400" : "text-white"
        }`}
      >
        {remaining}
      </div>
      {label && <div className="text-xs uppercase tracking-widest text-white/40">{label}</div>}
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isUrgent ? "bg-red-400" : "bg-accent-500"
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
