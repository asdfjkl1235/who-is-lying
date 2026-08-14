export type GamePhase =
  | "lobby"
  | "role_reveal"
  | "hint"
  | "discussion"
  | "voting"
  | "results"
  | "finished";

export type Role = "detective" | "imposter";

export interface PublicPlayer {
  id: string;
  username: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
}

export interface Hint {
  playerId: string;
  username: string;
  text: string;
  round: number;
  submittedAt: number;
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

export interface GameSettings {
  hintSeconds: number;
  discussionSeconds: number;
  votingSeconds: number;
  roleRevealSeconds: number;
  minPlayers: number;
  maxPlayers: number;
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
  winner: "detectives" | "imposter" | null;
  finalResult: FinalResult | null;
  settings: GameSettings;
}

export interface PrivateRoleView {
  role: Role;
  category: string;
  word: string | null;
}

export interface RoundResult {
  round: number;
  tally: Record<string, number>;
  eliminatedId: string | null;
  wasSkip: boolean;
  wasTie: boolean;
}
