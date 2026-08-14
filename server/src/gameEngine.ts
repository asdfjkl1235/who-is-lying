import { Server } from "socket.io";
import {
  GameRoom,
  Player,
  PublicRoomState,
  PublicPlayer,
  PrivateRoleView,
  GAME_SETTINGS,
} from "./types";

import { pickRandomCategoryAndWord } from "./words";
import { validateHint } from "./hints";
import { buildRoundResult } from "./voting";
import {
  saveRoom,
  setRoomTimer,
  clearRoomTimer,
} from "./store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getConnectedPlayers(room: GameRoom): Player[] {
  return room.players.filter((player) => player.connected);
}

/**
 * Strict majority.
 *
 * 4 players -> 3
 * 5 players -> 3
 * 6 players -> 4
 * 7 players -> 4
 */
export function getDiscussionSkipRequired(
  room: GameRoom
): number {
  const connectedCount = getConnectedPlayers(room).length;

  return Math.floor(connectedCount / 2) + 1;
}

// ---------------------------------------------------------------------------
// Public projection
// ---------------------------------------------------------------------------

export function projectPublicState(
  room: GameRoom
): PublicRoomState {
  const skipVoteIds = new Set(
    room.discussionSkipVotes
  );

  const players: PublicPlayer[] = room.players.map(
    (p) => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      ready: p.ready,
      connected: p.connected,

      // Useful for UI.
      hasSkippedDiscussion: skipVoteIds.has(p.id),

      // Useful for voting UI.
      hasVoted: room.votes.some(
        (vote) => vote.voterId === p.id
      ),
    })
  );

  const currentTurnPlayerId =
    room.phase === "hint"
      ? room.turnOrder[
          room.currentTurnIndex
        ] ?? null
      : null;

  const connectedCount =
    getConnectedPlayers(room).length;

  return {
    code: room.code,

    hostId: room.hostId,

    players,

    phase: room.phase,

    category: room.category,

    hintRound: room.hintRound,

    turnOrder: room.turnOrder,

    currentTurnPlayerId,

    hints: room.hints,

    phaseEndsAt: room.phaseEndsAt,

    votesSubmittedCount: room.votes.length,

    totalVoters: connectedCount,

    // NEW
    discussionSkipVotesCount:
      room.discussionSkipVotes.length,

    discussionSkipRequired:
      getDiscussionSkipRequired(room),

    winner: room.winner,

    finalResult:
      room.phase === "finished"
        ? room.finalResult
        : null,

    settings: GAME_SETTINGS,
  };
}

function broadcastRoomState(
  io: Server,
  room: GameRoom
) {
  saveRoom(room);

  io.to(room.code).emit(
    "room:update",
    projectPublicState(room)
  );
}

function emitPrivateRoles(
  io: Server,
  room: GameRoom
) {
  for (const player of room.players) {
    if (!player.socketId) continue;

    const view: PrivateRoleView =
      player.id === room.imposterId
        ? {
            role: "imposter",
            category: room.category!,
            word: null,
          }
        : {
            role: "detective",
            category: room.category!,
            word: room.secretWord!,
          };

    io.to(player.socketId).emit(
      "game:role",
      view
    );
  }
}

function shuffledIds(
  players: Player[]
): string[] {
  const ids = players
    .filter((p) => p.connected)
    .map((p) => p.id);

  for (
    let i = ids.length - 1;
    i > 0;
    i--
  ) {
    const j = Math.floor(
      Math.random() * (i + 1)
    );

    [ids[i], ids[j]] = [
      ids[j],
      ids[i],
    ];
  }

  return ids;
}

// ---------------------------------------------------------------------------
// Start game
// ---------------------------------------------------------------------------

export function startGame(
  io: Server,
  room: GameRoom
) {
  const { category, word } =
    pickRandomCategoryAndWord();

  const turnOrder =
    shuffledIds(room.players);

  const imposterId =
    turnOrder[
      Math.floor(
        Math.random() * turnOrder.length
      )
    ];

  room.category = category;

  room.secretWord = word;

  room.imposterId = imposterId;

  room.turnOrder = turnOrder;

  room.currentTurnIndex = 0;

  room.hintRound = 0;

  room.hints = [];

  room.votes = [];

  // Reset discussion skip votes.
  room.discussionSkipVotes = [];

  room.roundHistory = [];

  room.winner = null;

  room.finalResult = null;

  room.phase = "role_reveal";

  room.phaseEndsAt =
    Date.now() +
    GAME_SETTINGS.roleRevealSeconds * 1000;

  emitPrivateRoles(io, room);

  broadcastRoomState(io, room);

  setRoomTimer(
    room.code,
    setTimeout(
      () =>
        startHintRound(
          io,
          room
        ),
      GAME_SETTINGS.roleRevealSeconds *
        1000
    )
  );
}

// ---------------------------------------------------------------------------
// Hint phase
// ---------------------------------------------------------------------------

export function startHintRound(
  io: Server,
  room: GameRoom
) {
  room.hintRound += 1;

  room.currentTurnIndex = 0;

  room.phase = "hint";

  scheduleHintTurn(io, room);
}

function scheduleHintTurn(
  io: Server,
  room: GameRoom
) {
  // Skip disconnected players.
  while (
    room.currentTurnIndex <
      room.turnOrder.length &&
    !room.players.find(
      (p) =>
        p.id ===
          room.turnOrder[
            room.currentTurnIndex
          ] &&
        p.connected
    )
  ) {
    room.currentTurnIndex += 1;
  }

  if (
    room.currentTurnIndex >=
    room.turnOrder.length
  ) {
    startDiscussion(io, room);
    return;
  }

  room.phaseEndsAt =
    Date.now() +
    GAME_SETTINGS.hintSeconds * 1000;

  broadcastRoomState(io, room);

  setRoomTimer(
    room.code,
    setTimeout(() => {
      const currentPlayerId =
        room.turnOrder[
          room.currentTurnIndex
        ];

      const player =
        room.players.find(
          (p) =>
            p.id === currentPlayerId
        );

      if (player) {
        room.hints.push({
          playerId: player.id,
          username: player.username,
          text: "(no hint given)",
          round: room.hintRound,
          submittedAt: Date.now(),
        });

        io.to(room.code).emit(
          "hint:new",
          room.hints[
            room.hints.length - 1
          ]
        );
      }

      room.currentTurnIndex += 1;

      scheduleHintTurn(io, room);
    }, GAME_SETTINGS.hintSeconds * 1000)
  );
}

export interface SubmitHintResult {
  ok: boolean;
  error?: string;
}

export function submitHint(
  io: Server,
  room: GameRoom,
  playerId: string,
  rawText: string
): SubmitHintResult {
  if (room.phase !== "hint") {
    return {
      ok: false,
      error:
        "Hints aren't being collected right now.",
    };
  }

  const currentPlayerId =
    room.turnOrder[
      room.currentTurnIndex
    ];

  if (
    currentPlayerId !== playerId
  ) {
    return {
      ok: false,
      error:
        "It's not your turn yet.",
    };
  }

  const alreadySubmitted =
    room.hints.some(
      (h) =>
        h.playerId === playerId &&
        h.round === room.hintRound
    );

  if (alreadySubmitted) {
    return {
      ok: false,
      error:
        "You already gave a hint this round.",
    };
  }

  const validation =
    validateHint(
      rawText,
      room.secretWord!
    );

  if (!validation.valid) {
    return {
      ok: false,
      error:
        validation.reason,
    };
  }

  const player =
    room.players.find(
      (p) => p.id === playerId
    )!;

  const hint = {
    playerId,
    username: player.username,
    text: validation.cleanedText!,
    round: room.hintRound,
    submittedAt: Date.now(),
  };

  room.hints.push(hint);

  io.to(room.code).emit(
    "hint:new",
    hint
  );

  room.currentTurnIndex += 1;

  clearRoomTimer(room.code);

  scheduleHintTurn(io, room);

  return {
    ok: true,
  };
}

// ---------------------------------------------------------------------------
// Discussion
// ---------------------------------------------------------------------------

export function startDiscussion(
  io: Server,
  room: GameRoom
) {
  // Reset skip votes every time a discussion starts.
  room.discussionSkipVotes = [];

  room.phase = "discussion";

  room.phaseEndsAt =
    Date.now() +
    GAME_SETTINGS.discussionSeconds *
      1000;

  broadcastRoomState(io, room);

  setRoomTimer(
    room.code,
    setTimeout(
      () =>
        startVoting(
          io,
          room
        ),
      GAME_SETTINGS.discussionSeconds *
        1000
    )
  );
}

// ---------------------------------------------------------------------------
// Discussion skip voting
// ---------------------------------------------------------------------------

export interface SubmitDiscussionSkipResult {
  ok: boolean;
  error?: string;
  votes?: number;
  required?: number;
}

/**
 * Player votes to skip the discussion.
 *
 * A strict majority is required.
 */
export function submitDiscussionSkip(
  io: Server,
  room: GameRoom,
  playerId: string
): SubmitDiscussionSkipResult {
  if (room.phase !== "discussion") {
    return {
      ok: false,
      error:
        "Discussion isn't active right now.",
    };
  }

  const player =
    room.players.find(
      (p) => p.id === playerId
    );

  if (!player) {
    return {
      ok: false,
      error: "Player not found.",
    };
  }

  if (!player.connected) {
    return {
      ok: false,
      error:
        "You are disconnected.",
    };
  }

  const alreadyVoted =
    room.discussionSkipVotes.includes(
      playerId
    );

  if (alreadyVoted) {
    return {
      ok: false,
      error:
        "You already voted to skip.",
    };
  }

  room.discussionSkipVotes.push(
    playerId
  );

  const connectedCount =
    getConnectedPlayers(room).length;

  const required =
    Math.floor(
      connectedCount / 2
    ) + 1;

  const votes =
    room.discussionSkipVotes.length;

  // Tell everyone about the updated vote count.
  broadcastRoomState(io, room);

  // Majority reached.
  if (votes >= required) {
    clearRoomTimer(room.code);

    room.phaseEndsAt = null;

    io.to(room.code).emit(
      "discussion:skipped",
      {
        votes,
        required,
      }
    );

    startVoting(io, room);

    return {
      ok: true,
      votes,
      required,
    };
  }

  return {
    ok: true,
    votes,
    required,
  };
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

export function startVoting(
  io: Server,
  room: GameRoom
) {
  // Don't accidentally start voting twice.
  if (
    room.phase === "voting"
  ) {
    return;
  }

  room.phase = "voting";

  room.votes = [];

  room.phaseEndsAt =
    Date.now() +
    GAME_SETTINGS.votingSeconds *
      1000;

  broadcastRoomState(io, room);

  setRoomTimer(
    room.code,
    setTimeout(
      () =>
        resolveVotes(
          io,
          room
        ),
      GAME_SETTINGS.votingSeconds *
        1000
    )
  );
}

export interface SubmitVoteResult {
  ok: boolean;
  error?: string;
}

export function submitVote(
  io: Server,
  room: GameRoom,
  voterId: string,
  targetId: string | null
): SubmitVoteResult {
  if (room.phase !== "voting") {
    return {
      ok: false,
      error:
        "Voting isn't open right now.",
    };
  }

  const voter =
    room.players.find(
      (p) => p.id === voterId
    );

  if (!voter || !voter.connected) {
    return {
      ok: false,
      error:
        "You can't vote right now.",
    };
  }

  const alreadyVoted =
    room.votes.some(
      (v) =>
        v.voterId === voterId
    );

  if (alreadyVoted) {
    return {
      ok: false,
      error:
        "You already voted.",
    };
  }

  if (targetId) {
    const targetExists =
      room.players.some(
        (p) =>
          p.id === targetId &&
          p.connected
      );

    if (!targetExists) {
      return {
        ok: false,
        error:
          "That player can't be voted for.",
      };
    }
  }

  room.votes.push({
    voterId,
    targetId,
  });

  io.to(room.code).emit(
    "vote:update",
    {
      votesSubmittedCount:
        room.votes.length,

      totalVoters:
        getConnectedPlayers(room)
          .length,
    }
  );

  saveRoom(room);

  const connectedCount =
    getConnectedPlayers(room)
      .length;

  if (
    room.votes.length >=
    connectedCount
  ) {
    clearRoomTimer(room.code);

    resolveVotes(io, room);
  }

  return {
    ok: true,
  };
}

// ---------------------------------------------------------------------------
// Resolve votes
// ---------------------------------------------------------------------------

export function resolveVotes(
  io: Server,
  room: GameRoom
) {
  if (room.phase !== "voting") {
    return;
  }

  const result =
    buildRoundResult(
      room.hintRound,
      room.votes
    );

  room.roundHistory.push(
    result
  );

  room.phase = "results";

  room.phaseEndsAt = null;

  io.to(room.code).emit(
    "vote:result",
    result
  );

  broadcastRoomState(io, room);

  if (
    result.wasSkip ||
    result.wasTie
  ) {
    // No elimination.
    // Continue with another hint round.
    setRoomTimer(
      room.code,
      setTimeout(
        () =>
          startHintRound(
            io,
            room
          ),
        4000
      )
    );

    return;
  }

  const eliminatedIsImposter =
    result.eliminatedId ===
    room.imposterId;

  finishGame(
    io,
    room,
    eliminatedIsImposter
      ? "detectives"
      : "imposter",
    eliminatedIsImposter
      ? "correct_vote"
      : "wrong_vote",
    result.eliminatedId
  );
}

// ---------------------------------------------------------------------------
// Finish game
// ---------------------------------------------------------------------------

export function finishGame(
  io: Server,
  room: GameRoom,
  winner:
    | "detectives"
    | "imposter",
  reason:
    | "correct_vote"
    | "wrong_vote"
    | "imposter_disconnected",
  eliminatedId: string | null
) {
  clearRoomTimer(room.code);

  room.phase = "finished";

  room.winner = winner;

  room.phaseEndsAt = null;

  const lastTally =
    room.roundHistory.length > 0
      ? room.roundHistory[
          room.roundHistory.length - 1
        ].tally
      : {};

  room.finalResult = {
    winner,

    imposterId:
      room.imposterId!,

    secretWord:
      room.secretWord!,

    category:
      room.category!,

    finalTally:
      lastTally,

    eliminatedId,

    reason,
  };

  broadcastRoomState(io, room);

  io.to(room.code).emit(
    "game:result",
    room.finalResult
  );
}

// ---------------------------------------------------------------------------
// Rematch
// ---------------------------------------------------------------------------

export function rematch(
  io: Server,
  room: GameRoom
) {
  room.players.forEach(
    (p) => {
      p.ready = p.isHost;
    }
  );

  room.discussionSkipVotes = [];

  startGame(io, room);
}

// ---------------------------------------------------------------------------
// Imposter disconnect
// ---------------------------------------------------------------------------

export function handleImposterDisconnect(
  io: Server,
  room: GameRoom
) {
  clearRoomTimer(room.code);

  room.phase = "finished";

  room.winner = null;

  room.phaseEndsAt = null;

  room.finalResult = {
    winner: "detectives",

    imposterId:
      room.imposterId!,

    secretWord:
      room.secretWord!,

    category:
      room.category!,

    finalTally: {},

    eliminatedId: null,

    reason:
      "imposter_disconnected",
  };

  broadcastRoomState(io, room);

  io.to(room.code).emit(
    "game:result",
    room.finalResult
  );
}

export {
  broadcastRoomState,
};