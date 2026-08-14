"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { PublicRoomState } from "@/types/game";

export default function ResultScreen({
  room,
  playerId,
  onRematch,
  onLeave,
}: {
  room: PublicRoomState;
  playerId: string | null;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const router = useRouter();
  const result = room.finalResult;
  if (!result) return null;

  const nameOf = (id: string | null) => (id ? room.players.find((p) => p.id === id)?.username ?? "Unknown" : null);
  const detectivesWin = result.winner === "detectives";
  const isHost = room.players.find((p) => p.id === playerId)?.isHost;

  const tallyEntries = Object.entries(result.finalTally)
    .map(([key, count]) => ({ label: key === "skip" ? "Skip" : nameOf(key) ?? "Unknown", count }))
    .sort((a, b) => b.count - a.count);

  function handleLeave() {
    onLeave();
    router.push("/");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 text-center"
    >
      <div className={`glass-card w-full rounded-3xl p-8 shadow-glow ${detectivesWin ? "border-emerald-500/30" : "border-red-500/30"}`}>
        <div className="text-4xl">{detectivesWin ? "🎉" : "😈"}</div>
        <h2 className={`mt-3 text-2xl font-bold ${detectivesWin ? "text-emerald-300" : "text-red-300"}`}>
          {detectivesWin ? "Detectives Win" : "Imposter Wins"}
        </h2>

        {result.reason === "imposter_disconnected" && (
          <p className="mt-2 text-sm text-white/50">The Imposter disconnected. The round has ended.</p>
        )}

        {result.reason !== "imposter_disconnected" && (
          <p className="mt-2 text-sm text-white/60">
            {result.eliminatedId && nameOf(result.eliminatedId)} was voted out.
            {" "}
            {detectivesWin ? "They were the Imposter." : (
              <>
                The actual Imposter was <span className="font-semibold text-white">{nameOf(result.imposterId)}</span>.
              </>
            )}
          </p>
        )}

        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest text-white/40">The word was</div>
          <div className="mt-1 text-2xl font-bold text-white">{result.secretWord}</div>
          <div className="text-xs text-white/40">({result.category})</div>
        </div>

        {tallyEntries.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 text-left">
            <div className="text-xs uppercase tracking-widest text-white/40">Voting results</div>
            {tallyEntries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{entry.label}</span>
                <span className="font-semibold text-white">{entry.count} vote{entry.count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex w-full gap-3">
        {isHost ? (
          <button onClick={onRematch} className="btn-primary flex-1">
            Rematch
          </button>
        ) : (
          <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm text-white/40">
            Waiting for host to start a rematch…
          </div>
        )}
        <button onClick={handleLeave} className="btn-secondary flex-1">
          Return to Home
        </button>
      </div>
    </motion.div>
  );
}
