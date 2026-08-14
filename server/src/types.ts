// Core shared types for the "Who Is Lying?" game engine.
// Kept deliberately framework-agnostic so gameEngine.ts stays pure/testable.

export type GamePhase =
  | "lobby"
  | "role_reveal"
  | "hint"
  | "discussion"
  | "voting"
  | "results"
  | "finished";

export type Role = "detective" | "imposter";

export interface Player {
  id: string;
  socketId: string | null;
  username: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  joinedAt: number;
}

export interface Hint {
  playerId: string;
  username: string;
  text: string;
  round: number;
  submittedAt: number;
}

export interface Vote {
  voterId: string;
  targetId: string | null;
}

export interface RoundResult {
  round: number;
  tally: Record<string, number>;
  eliminatedId: string | null;
  wasSkip: boolean;
  wasTie: boolean;
}

export interface FinalResult {
  winner: "detectives" | "imposter";
  imposterId: string;
  secretWord: string;
  category: string;
  finalTally: Record<string, number>;
  eliminatedId: string | null;
  reason: "correct_vote" | "wrong_vote" | "imposter_disconnected";
}

export const GAME_SETTINGS = {
  hintSeconds: 15,
  discussionSeconds: 30,
  votingSeconds: 20,
  roleRevealSeconds: 5,
  minPlayers: 4,
  maxPlayers: 20,
} as const;

// Internal server-only room representation.
export interface GameRoom {
  id: string;
  code: string;
  hostId: string;

  players: Player[];

  phase: GamePhase;

  category: string | null;
  secretWord: string | null;
  imposterId: string | null;

  hintRound: number;
  turnOrder: string[];
  currentTurnIndex: number;

  hints: Hint[];

  // Actual player elimination votes.
  votes: Vote[];

  // Players who voted to skip the discussion phase.
  discussionSkipVotes: string[];

  roundHistory: RoundResult[];

  phaseEndsAt: number | null;
  createdAt: number;

  winner: "detectives" | "imposter" | null;
  finalResult: FinalResult | null;
}

// Public player information.
export interface PublicPlayer {
  id: string;
  username: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  hasVoted?: boolean;
  hasSkippedDiscussion?: boolean;
}

export interface PublicRoomState {
  code: string;
  hostId: string;
  players: PublicPlayer[];

  phase: GamePhase;

  category: string | null;

  hintRound: number;
  turnOrder: string[];
  currentTurnPlayerId: string | null;

  hints: Hint[];

  phaseEndsAt: number | null;

  votesSubmittedCount: number;
  totalVoters: number;

  // Discussion skip vote information.
  discussionSkipVotesCount: number;
  discussionSkipRequired: number;

  winner: "detectives" | "imposter" | null;
  finalResult: FinalResult | null;

  settings: typeof GAME_SETTINGS;
}

export interface PrivateRoleView {
  role: Role;
  category: string;
  word: string | null;
  // ALWAYS null for the imposter.
}