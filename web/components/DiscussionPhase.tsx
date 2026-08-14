"use client";

import { useState } from "react";

import {
  PublicRoomState,
} from "@/types/game";

import Timer from "./Timer";

interface DiscussionPhaseProps {
  room: PublicRoomState;

  playerId: string | null;

  onSkipDiscussion: () => Promise<{
    ok: boolean;
    error?: string;
    votes?: number;
    needed?: number;
  }>;
}

export default function DiscussionPhase({
  room,
  playerId,
  onSkipDiscussion,
}: DiscussionPhaseProps) {
  const [
    skipLoading,
    setSkipLoading,
  ] = useState(false);

  const [
    skipError,
    setSkipError,
  ] = useState<string | null>(
    null
  );

  /*
   * We cannot rely on hasVotedToSkipDiscussion
   * from the public state because the same state is
   * broadcast to everyone.
   *
   * Instead, the server response updates the local UI.
   */
  const [
    hasVoted,
    setHasVoted,
  ] = useState(false);

  async function handleSkip() {
    if (
      skipLoading ||
      hasVoted
    ) {
      return;
    }

    setSkipLoading(true);
    setSkipError(null);

    try {
      const result =
        await onSkipDiscussion();

      if (!result.ok) {
        setSkipError(
          result.error ??
            "Unable to vote."
        );

        return;
      }

      setHasVoted(true);
    } catch {
      setSkipError(
        "Something went wrong. Try again."
      );
    } finally {
      setSkipLoading(false);
    }
  }

  const votes =
    room.discussionSkipVotesCount;

  const needed =
    room.discussionSkipVotesNeeded;

  const connectedPlayers =
    room.players.filter(
      (p) => p.connected
    ).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
      <div className="text-3xl">
        💬
      </div>

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

      <Timer
        endsAt={room.phaseEndsAt}
        totalSeconds={
          room.settings
            .discussionSeconds
        }
        label="Seconds left"
      />

      {/* ------------------------------------------------------------- */}
      {/* Skip discussion */}
      {/* ------------------------------------------------------------- */}

      <div className="glass-card w-full rounded-2xl p-5">
        <div className="flex flex-col items-center gap-3">
          <div className="text-sm font-semibold text-white">
            Want to skip discussion?
          </div>

          <p className="text-xs text-white/40">
            A majority vote will immediately
            start the voting phase.
          </p>

          <button
            type="button"
            onClick={handleSkip}
            disabled={
              skipLoading ||
              hasVoted
            }
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              hasVoted
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-accent-500 text-white hover:bg-accent-400"
            }`}
          >
            {skipLoading
              ? "Voting..."
              : hasVoted
                ? "✓ Skip vote submitted"
                : "Skip Discussion"}
          </button>

          <div className="text-xs text-white/50">
            {votes} / {needed} votes
            needed
          </div>

          <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-accent-500 transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  needed > 0
                    ? (votes /
                        needed) *
                        100
                    : 0
                )}%`,
              }}
            />
          </div>

          <div className="text-[11px] text-white/30">
            {connectedPlayers} players
            connected
          </div>

          {skipError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {skipError}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Hints */}
      {/* ------------------------------------------------------------- */}

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
            (_, i) =>
              i + 1
          ).map(
            (round) => (
              <div
                key={round}
              >
                {room.hintRound >
                  1 && (
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-400">
                    Round{" "}
                    {round}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {room.hints
                    .filter(
                      (h) =>
                        h.round ===
                        round
                    )
                    .map(
                      (h) => (
                        <span
                          key={`${h.playerId}-${h.round}`}
                          className="rounded-full bg-white/5 px-3 py-1.5 text-sm text-white/80"
                        >
                          <span className="text-white/40">
                            {
                              h.username
                            }
                            :
                          </span>{" "}
                          {h.text}
                        </span>
                      )
                    )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}