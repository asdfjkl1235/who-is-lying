"use client";

import { PublicPlayer } from "@/types/game";

const DOT_COLORS = ["bg-purple-400", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400"];

export function playerColor(index: number) {
  return DOT_COLORS[index % DOT_COLORS.length];
}

export default function PlayerList({
  players,
  showReady = true,
  currentTurnPlayerId,
}: {
  players: PublicPlayer[];
  showReady?: boolean;
  currentTurnPlayerId?: string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {players.map((p, i) => (
        <div
          key={p.id}
          className={`glass-card flex items-center justify-between rounded-xl px-4 py-3 transition ${
            currentTurnPlayerId === p.id ? "ring-1 ring-accent-500" : ""
          } ${!p.connected ? "opacity-40" : ""}`}
        >
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${playerColor(i)}`} />
            <span className="font-medium text-white">{p.username}</span>
            {p.isHost && (
              <span className="rounded-full bg-accent-600/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-400">
                Host
              </span>
            )}
            {!p.connected && (
              <span className="text-[10px] uppercase tracking-wide text-white/40">Reconnecting…</span>
            )}
          </div>
          {showReady && (
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                p.ready ? "text-emerald-400" : "text-white/30"
              }`}
            >
              {p.ready ? "Ready" : "Not ready"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
