// Core shared types for the "Who Is Lying?" game engine.

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
  reason:
    | "correct_vote"
    | "wrong_vote"
    | "imposter_disconnected";
}

export const GAME_SETTINGS = {
  hintSeconds: 25,
  discussionSeconds: 30,
  votingSeconds: 20,
  roleRevealSeconds: 5,
  minPlayers: 4,
  maxPlayers: 20,
} as const;

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
  votes: Vote[];

  roundHistory: RoundResult[];

  /*
   * Players who voted to skip the discussion.
   *
   * Only one vote per player.
   */
  discussionSkipVotes: string[];

  phaseEndsAt: number | null;
  createdAt: number;

  winner: "detectives" | "imposter" | null;
  finalResult: FinalResult | null;
}

export interface PublicPlayer {
  id: string;
  username: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  hasVoted?: boolean;
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

  /*
   * Discussion skip voting information.
   */
  discussionSkipVotesCount: number;
  discussionSkipVotesNeeded: number;
  hasVotedToSkipDiscussion: boolean;

  winner: "detectives" | "imposter" | null;

  finalResult: FinalResult | null;

  settings: typeof GAME_SETTINGS;
}

export interface PrivateRoleView {
  role: Role;
  category: string;
  word: string | null;
}