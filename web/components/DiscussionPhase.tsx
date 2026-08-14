"use client";

import { PublicRoomState } from "@/types/game";
import Timer from "./Timer";

export default function DiscussionPhase({ room }: { room: PublicRoomState }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <div className="text-3xl">💬</div>
      <h2 className="text-2xl font-bold text-white">Discussion</h2>
      <p className="text-white/50">
        Talk with your friends and figure out who the Imposter is.
        <br />
        Use your <span className="text-accent-400">Discord voice channel</span> to discuss.
      </p>
      <Timer endsAt={room.phaseEndsAt} totalSeconds={room.settings.discussionSeconds} label="Seconds left" />

      <div className="glass-card w-full rounded-2xl p-6 text-left">
        <div className="mb-3 text-xs uppercase tracking-widest text-white/40">All hints</div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: room.hintRound }, (_, i) => i + 1).map((round) => (
            <div key={round}>
              {room.hintRound > 1 && (
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-400">
                  Round {round}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {room.hints
                  .filter((h) => h.round === round)
                  .map((h) => (
                    <span
                      key={`${h.playerId}-${h.round}`}
                      className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/80"
                    >
                      <span className="text-white/40">{h.username}:</span> {h.text}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
