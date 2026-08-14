"use client";

import { motion } from "framer-motion";
import { PublicRoomState } from "@/types/game";
import PlayerList from "./PlayerList";

export default function Lobby({
  room,
  playerId,
  onToggleReady,
  onStart,
}: {
  room: PublicRoomState;
  playerId: string | null;
  onToggleReady: (ready: boolean) => void;
  onStart: () => void;
}) {
  const me = room.players.find((p) => p.id === playerId);
  const isHost = me?.isHost ?? false;
  const connectedPlayers = room.players.filter((p) => p.connected);
  const everyoneReady = connectedPlayers.every((p) => p.ready);
  const enoughPlayers = connectedPlayers.length >= room.settings.minPlayers;
  const canStart = isHost && everyoneReady && enoughPlayers;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-lg flex-col gap-6"
    >
      <div className="glass-card rounded-2xl p-6 text-center shadow-glow">
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Room code</div>
        <div className="mt-2 flex items-center justify-center gap-3">
          <span className="text-4xl font-bold tracking-[0.2em] text-white">{room.code}</span>
          <button
            onClick={() => navigator.clipboard.writeText(room.code)}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Copy
          </button>
        </div>
        <p className="mt-2 text-sm text-white/50">Share this code in your Discord voice channel.</p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between text-sm text-white/50">
          <span>
            {connectedPlayers.length} / {room.settings.maxPlayers} players
          </span>
          <span>Min {room.settings.minPlayers} to start</span>
        </div>
        <PlayerList players={room.players} />
      </div>

      {!enoughPlayers && (
        <p className="text-center text-sm text-amber-300/80">
          Waiting for at least {room.settings.minPlayers} players to join…
        </p>
      )}

      {isHost ? (
        <button className="btn-primary w-full text-lg" disabled={!canStart} onClick={onStart}>
          {enoughPlayers ? (everyoneReady ? "Start Game" : "Waiting for everyone to ready up") : "Waiting for players"}
        </button>
      ) : (
        <button
          className={`w-full rounded-xl px-6 py-3 text-lg font-semibold transition ${
            me?.ready ? "btn-secondary" : "btn-primary"
          }`}
          onClick={() => onToggleReady(!me?.ready)}
        >
          {me?.ready ? "Unready" : "I'm Ready"}
        </button>
      )}
    </motion.div>
  );
}
