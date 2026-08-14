"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PublicRoomState, PrivateRoleView } from "@/types/game";
import Timer from "./Timer";

export default function HintPhase({
  room,
  role,
  playerId,
  onSubmitHint,
}: {
  room: PublicRoomState;
  role: PrivateRoleView | null;
  playerId: string | null;
  onSubmitHint: (text: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isMyTurn = room.currentTurnPlayerId === playerId;
  const currentPlayer = room.players.find((p) => p.id === room.currentTurnPlayerId);
  const alreadySubmittedThisRound = room.hints.some(
    (h) => h.playerId === playerId && h.round === room.hintRound
  );

  const roundsGrouped = Array.from({ length: room.hintRound }, (_, i) => i + 1)
    .reverse()
    .map((round) => ({
      round,
      hints: room.hints.filter((h) => h.round === round),
    }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmitHint(text.trim());
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Couldn't submit that hint.");
    } else {
      setText("");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="glass-card rounded-2xl p-6 text-center">
        <div className="text-xs uppercase tracking-widest text-accent-400">Hint Round {room.hintRound}</div>
        <div className="mt-2 text-lg font-semibold text-white">{room.category}</div>
        <div className="mt-1 text-2xl font-bold text-white">{role?.word ?? "???"}</div>
        <div className="mt-4">
          <Timer endsAt={room.phaseEndsAt} totalSeconds={room.settings.hintSeconds} />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 text-center text-sm text-white/50">
          Current turn:{" "}
          <span className="font-semibold text-white">
            {currentPlayer?.username ?? "…"}
            {isMyTurn && " (You)"}
          </span>
        </div>

        {isMyTurn && !alreadySubmittedThisRound ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={60}
              placeholder="Give a hint without saying the word…"
              className="input-field"
            />
            {error && <div className="text-sm text-red-400">{error}</div>}
            <button type="submit" className="btn-primary" disabled={!text.trim() || submitting}>
              {submitting ? "Submitting…" : "Submit Hint"}
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] py-6 text-center text-sm text-white/40">
            {isMyTurn ? "Hint submitted — waiting for others." : "Waiting for their hint…"}
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="mb-3 text-xs uppercase tracking-widest text-white/40">Hints</div>
        <div className="flex flex-col gap-5">
          {roundsGrouped.map(({ round, hints }) => (
            <div key={round}>
              {room.hintRound > 1 && (
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-400">
                  Round {round}
                </div>
              )}
              <div className="flex flex-col gap-2">
                {hints.length === 0 && <div className="text-sm text-white/30">No hints yet.</div>}
                {hints.map((h, i) => (
                  <motion.div
                    key={`${h.playerId}-${h.round}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2"
                  >
                    <span className="text-sm font-medium text-white/60">{h.username}</span>
                    <span className="text-sm font-semibold text-white">{h.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
