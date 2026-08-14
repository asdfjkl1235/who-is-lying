import { GameRoom, Player, GAME_SETTINGS } from "./types";
import {
  generateUniqueRoomCode,
  generatePlayerId,
} from "./store";

export function createRoom(
  hostUsername: string
): { room: GameRoom; hostPlayer: Player } {
  const code = generateUniqueRoomCode();

  const hostPlayer: Player = {
    id: generatePlayerId(),
    socketId: null,
    username: hostUsername.trim().slice(0, 20),
    isHost: true,
    ready: true,
    connected: true,
    joinedAt: Date.now(),
  };

  const room: GameRoom = {
    id: code,
    code,
    hostId: hostPlayer.id,

    players: [hostPlayer],

    phase: "lobby",

    category: null,
    secretWord: null,
    imposterId: null,

    hintRound: 0,
    turnOrder: [],
    currentTurnIndex: 0,

    hints: [],
    votes: [],

    roundHistory: [],

    // NEW
    discussionSkipVotes: [],

    phaseEndsAt: null,
    createdAt: Date.now(),

    winner: null,
    finalResult: null,
  };

  return {
    room,
    hostPlayer,
  };
}

export type JoinError =
  | "room_not_found"
  | "room_full"
  | "game_already_started"
  | "invalid_username";

export function canJoinRoom(
  room: GameRoom | undefined
): JoinError | null {
  if (!room) return "room_not_found";

  if (room.phase !== "lobby") {
    return "game_already_started";
  }

  if (
    room.players.filter((p) => p.connected).length >=
    GAME_SETTINGS.maxPlayers
  ) {
    return "room_full";
  }

  return null;
}

export function addPlayer(
  room: GameRoom,
  username: string
): Player {
  const player: Player = {
    id: generatePlayerId(),
    socketId: null,
    username: username.trim().slice(0, 20) || "Player",
    isHost: false,
    ready: false,
    connected: true,
    joinedAt: Date.now(),
  };

  room.players.push(player);

  return player;
}

export function removePlayer(
  room: GameRoom,
  playerId: string
) {
  room.players = room.players.filter(
    (p) => p.id !== playerId
  );

  // Also remove their discussion skip vote.
  room.discussionSkipVotes =
    room.discussionSkipVotes.filter(
      (id) => id !== playerId
    );

  reassignHostIfNeeded(room);
}

export function reassignHostIfNeeded(
  room: GameRoom
): Player | null {
  const currentHost = room.players.find(
    (p) => p.id === room.hostId
  );

  if (currentHost && currentHost.connected) {
    return null;
  }

  const nextHost = room.players.find(
    (p) => p.connected
  );

  if (nextHost) {
    room.hostId = nextHost.id;

    room.players.forEach((p) => {
      p.isHost = p.id === nextHost.id;
    });

    nextHost.ready = true;

    return nextHost;
  }

  return null;
}

export function canStartGame(
  room: GameRoom
): {
  ok: boolean;
  reason?: string;
} {
  const connected = room.players.filter(
    (p) => p.connected
  );

  if (connected.length < GAME_SETTINGS.minPlayers) {
    return {
      ok: false,
      reason: `Need at least ${GAME_SETTINGS.minPlayers} players.`,
    };
  }

  if (!connected.every((p) => p.ready)) {
    return {
      ok: false,
      reason: "Not everyone is ready yet.",
    };
  }

  return {
    ok: true,
  };
}