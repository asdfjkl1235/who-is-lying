"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PublicRoomState } from "@/types/game";
import Timer from "./Timer";
import { playerColor } from "./PlayerList";

export default function VotingPhase({
  room,
  playerId,
  onSubmitVote,
}: {
  room: PublicRoomState;
  playerId: string | null;
  onSubmitVote: (targetId: string | null) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [hasVoted, setHasVoted] = useState(false);
  const [pendingId, setPendingId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Reset local "have I voted" state whenever a fresh voting phase starts.
  useEffect(() => {
    setHasVoted(false);
    setPendingId(undefined);
    setError(null);
  }, [room.hintRound, room.phaseEndsAt]);

  async function castVote(targetId: string | null) {
    if (hasVoted || pendingId !== undefined) return;
    setPendingId(targetId);
    setError(null);
    const res = await onSubmitVote(targetId);
    if (res.ok) {
      setHasVoted(true);
    } else {
      setError(res.error ?? "Couldn't submit your vote.");
      setPendingId(undefined);
    }
  }

  const votable = room.players.filter((p) => p.connected && p.id !== playerId);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center">
      <h2 className="text-2xl font-bold text-white">Who is the Imposter?</h2>
      <p className="text-sm text-white/50">Choose carefully.</p>
      <Timer endsAt={room.phaseEndsAt} totalSeconds={room.settings.votingSeconds} />

      {hasVoted ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card w-full rounded-2xl p-8"
        >
          <div className="text-lg font-semibold text-white">Vote locked in</div>
          <div className="mt-1 text-sm text-white/40">
            Waiting for everyone else… ({room.votesSubmittedCount}/{room.totalVoters})
          </div>
        </motion.div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          {votable.map((p, i) => (
            <button
              key={p.id}
              onClick={() => castVote(p.id)}
              disabled={pendingId !== undefined}
              className="glass-card flex items-center gap-3 rounded-xl px-5 py-3.5 text-left transition hover:border-accent-500/50 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${playerColor(i)}`} />
              <span className="font-medium text-white">{p.username}</span>
            </button>
          ))}

          <button
            onClick={() => castVote(null)}
            disabled={pendingId !== undefined}
            className="btn-secondary mt-2 w-full disabled:opacity-50"
          >
            Skip Vote
          </button>

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>
      )}
    </div>
  );
}
