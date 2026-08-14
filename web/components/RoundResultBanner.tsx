"use client";

import { motion } from "framer-motion";
import { PublicRoomState, RoundResult } from "@/types/game";

export default function RoundResultBanner({
  room,
  result,
}: {
  room: PublicRoomState;
  result: RoundResult | null;
}) {
  const nameOf = (id: string) => room.players.find((p) => p.id === id)?.username ?? "Unknown";

  const tallyEntries = result
    ? Object.entries(result.tally)
        .map(([key, count]) => ({
          label: key === "skip" ? "Skip" : nameOf(key),
          count,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center"
    >
      <div className="glass-card w-full rounded-2xl p-8">
        {result?.wasTie && (
          <>
            <div className="text-3xl">⚖️</div>
            <h2 className="mt-3 text-xl font-bold text-white">Tie!</h2>
            <p className="mt-1 text-sm text-white/50">Nobody was eliminated. Another hint round is coming up.</p>
          </>
        )}
        {result?.wasSkip && !result?.wasTie && (
          <>
            <div className="text-3xl">⏭️</div>
            <h2 className="mt-3 text-xl font-bold text-white">Vote Skipped</h2>
            <p className="mt-1 text-sm text-white/50">Same word, same imposter. One more hint round.</p>
          </>
        )}
        {!result?.wasTie && !result?.wasSkip && (
          <>
            <div className="text-3xl">🗳️</div>
            <h2 className="mt-3 text-xl font-bold text-white">Votes are in</h2>
          </>
        )}

        {tallyEntries.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 text-left">
            {tallyEntries.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between text-sm">
                <span className="text-white/70">{entry.label}</span>
                <span className="font-semibold text-white">{entry.count} vote{entry.count === 1 ? "" : "s"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
