"use client";

import { useState } from "react";

import { PublicRoomState } from "@/types/game";
import Timer from "./Timer";

interface DiscussionPhaseProps {
  room: PublicRoomState;
  playerId: string | null;
  onSkipDiscussion: () => Promise<{
    ok: boolean;
    error?: string;
  }>;
}

export default function DiscussionPhase({
  room,
  playerId,
  onSkipDiscussion,
}: DiscussionPhaseProps) {
  const [submitting, setSubmitting] =
    useState(false);

  const currentPlayer =
    room.players.find(
      (player) =>
        player.id === playerId
    );

  const hasVoted =
    currentPlayer?.hasSkippedDiscussion ??
    false;

  const skipVotes =
    room.discussionSkipVotesCount;

  const required =
    room.discussionSkipRequired;

  async function handleSkip() {
    if (
      submitting ||
      hasVoted
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await onSkipDiscussion();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      {/* Icon */}
      <div className="text-3xl">
        💬
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white">
        Discussion
      </h2>

      <p className="text-white/50">
        Talk with your friends and figure
        out who the Imposter is.
        <br />
        Use your{" "}
        <span className="text-accent-400">
          Discord voice channel
        </span>{" "}
        to discuss.
      </p>

      {/* Timer */}
      <Timer
        endsAt={room.phaseEndsAt}
        totalSeconds={
          room.settings.discussionSeconds
        }
        label="Seconds left"
      />

      {/* Skip discussion card */}
      <div className="glass-card w-full rounded-2xl p-6">
        <div className="flex flex-col items-center gap-4">
          <div>
            <div className="text-sm font-semibold text-white">
              Skip Discussion?
            </div>

            <div className="mt-1 text-xs text-white/40">
              A majority of players must agree.
            </div>
          </div>

          {/* Vote counter */}
          <div className="rounded-xl bg-white/5 px-5 py-3">
            <span className="text-2xl font-bold text-white">
              {skipVotes}
            </span>

            <span className="mx-2 text-white/30">
              /
            </span>

            <span className="text-lg font-semibold text-accent-400">
              {required}
            </span>

            <div className="mt-1 text-xs text-white/40">
              votes needed
            </div>
          </div>

          {/* Button */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={
              submitting ||
              hasVoted
            }
            className={[
              "w-full max-w-sm rounded-xl px-5 py-3",
              "font-semibold transition",
              "border",
              hasVoted
                ? "cursor-not-allowed border-accent-400/20 bg-accent-400/10 text-accent-300"
                : "border-white/10 bg-white/5 text-white hover:bg-white/10",
              submitting
                ? "opacity-50"
                : "",
            ].join(" ")}
          >
            {submitting
              ? "Submitting..."
              : hasVoted
                ? "✓ Skip Vote Submitted"
                : "⏭ Skip Discussion"}
          </button>

          {/* Status */}
          {hasVoted && (
            <p className="text-xs text-white/40">
              Waiting for the other players...
            </p>
          )}
        </div>
      </div>

      {/* Hints */}
      <div className="glass-card w-full rounded-2xl p-6 text-left">
        <div className="mb-3 text-xs uppercase tracking-widest text-white/40">
          All hints
        </div>

        <div className="flex flex-col gap-4">
          {Array.from(
            {
              length:
                room.hintRound,
            },
            (_, i) => i + 1
          ).map((round) => (
            <div key={round}>
              {room.hintRound > 1 && (
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-400">
                  Round {round}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {room.hints
                  .filter(
                    (h) =>
                      h.round === round
                  )
                  .map((h) => (
                    <span
                      key={`${h.playerId}-${h.round}`}
                      className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/80"
                    >
                      <span className="text-white/40">
                        {h.username}:
                      </span>{" "}
                      {h.text}
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