"use client";

import {
  useEffect,
  useState,
} from "react";

import { useParams } from "next/navigation";

import Link from "next/link";

import {
  useGameSocket,
} from "@/hooks/useGameSocket";

import ConnectionStatus from "@/components/ConnectionStatus";
import Lobby from "@/components/Lobby";
import RoleReveal from "@/components/RoleReveal";
import HintPhase from "@/components/HintPhase";
import DiscussionPhase from "@/components/DiscussionPhase";
import VotingPhase from "@/components/VotingPhase";
import RoundResultBanner from "@/components/RoundResultBanner";
import ResultScreen from "@/components/ResultScreen";

export default function RoomPage() {
  const params =
    useParams<{
      code: string;
    }>();

  const code =
    params.code;

  const {
    status,

    room,

    role,

    playerId,

    lastError,

    lastRoundResult,

    setReady,

    startGame,

    submitHint,

    skipDiscussion,

    submitVote,

    requestRematch,

    leaveRoom,

    clearError,
  } = useGameSocket();

  const [
    waitedLongEnough,
    setWaitedLongEnough,
  ] = useState(false);

  // -----------------------------------------------------------------------
  // Connection timeout
  // -----------------------------------------------------------------------

  useEffect(() => {
    const timer =
      setTimeout(() => {
        setWaitedLongEnough(
          true
        );
      }, 4000);

    return () =>
      clearTimeout(timer);
  }, []);

  // -----------------------------------------------------------------------
  // Error timeout
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!lastError)
      return;

    const timer =
      setTimeout(() => {
        clearError();
      }, 4000);

    return () =>
      clearTimeout(timer);
  }, [
    lastError,
    clearError,
  ]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (!room) {
    if (!waitedLongEnough) {
      return (
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-white/40">
            Connecting to room{" "}
            {code || "…"}…
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-lg text-white/60">
          We couldn&apos;t find you
          in room {code}.
        </div>

        <Link
          href="/join"
          className="btn-primary"
        >
          Join a Room
        </Link>
      </main>
    );
  }

  // -----------------------------------------------------------------------
  // Game
  // -----------------------------------------------------------------------

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      {lastError && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-950/80 px-4 py-2 text-sm text-red-200 backdrop-blur">
          {lastError}
        </div>
      )}

      <ConnectionStatus
        status={status}
      />

      {/* Lobby */}

      {room.phase ===
        "lobby" && (
        <Lobby
          room={room}
          playerId={
            playerId
          }
          onToggleReady={
            setReady
          }
          onStart={
            startGame
          }
        />
      )}

      {/* Role reveal */}

      {room.phase ===
        "role_reveal" && (
        <RoleReveal
          role={role}
          room={room}
        />
      )}

      {/* Hint */}

      {room.phase ===
        "hint" && (
        <HintPhase
          room={room}
          role={role}
          playerId={
            playerId
          }
          onSubmitHint={
            submitHint
          }
        />
      )}

      {/* Discussion */}

      {room.phase ===
        "discussion" && (
        <DiscussionPhase
          room={room}
          playerId={
            playerId
          }
          onSkipDiscussion={
            skipDiscussion
          }
        />
      )}

      {/* Voting */}

      {room.phase ===
        "voting" && (
        <VotingPhase
          room={room}
          playerId={
            playerId
          }
          onSubmitVote={
            submitVote
          }
        />
      )}

      {/* Round result */}

      {room.phase ===
        "results" && (
        <RoundResultBanner
          room={room}
          result={
            lastRoundResult
          }
        />
      )}

      {/* Final result */}

      {room.phase ===
        "finished" && (
        <ResultScreen
          room={room}
          playerId={
            playerId
          }
          onRematch={
            requestRematch
          }
          onLeave={
            leaveRoom
          }
        />
      )}
    </main>
  );
}