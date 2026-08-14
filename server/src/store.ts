import { nanoid, customAlphabet } from "nanoid";
import { GameRoom } from "./types";
import { redisSetJSON, redisDelete } from "./redis";

// Room codes: unambiguous uppercase alphanumeric (no 0/O/1/I) so they're
// easy to read aloud / type into Discord.
const codeAlphabet = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 5);

const rooms = new Map<string, GameRoom>(); // key: room code
const sessions = new Map<string, { roomCode: string; playerId: string }>(); // key: sessionToken
const roomTimers = new Map<string, NodeJS.Timeout>(); // key: room code, one active phase timer per room

const SESSION_TTL_SECONDS = 60 * 60 * 6; // 6 hours, generous reconnect window
const ROOM_TTL_SECONDS = 60 * 60 * 4;

export function generateUniqueRoomCode(): string {
  let code = codeAlphabet();
  while (rooms.has(code)) {
    code = codeAlphabet();
  }
  return code;
}

export function generatePlayerId(): string {
  return nanoid(12);
}

export function generateSessionToken(): string {
  return nanoid(32);
}

export function saveRoom(room: GameRoom) {
  rooms.set(room.code, room);
  void redisSetJSON(`room:${room.code}`, room, ROOM_TTL_SECONDS);
}

export function getRoom(code: string): GameRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string) {
  rooms.delete(code);
  clearRoomTimer(code);
  void redisDelete(`room:${code}`);
}

export function allRooms(): GameRoom[] {
  return Array.from(rooms.values());
}

export function saveSession(token: string, roomCode: string, playerId: string) {
  sessions.set(token, { roomCode, playerId });
  void redisSetJSON(`session:${token}`, { roomCode, playerId }, SESSION_TTL_SECONDS);
}

export function getSession(token: string) {
  return sessions.get(token);
}

export function deleteSession(token: string) {
  sessions.delete(token);
  void redisDelete(`session:${token}`);
}

// --- Per-room phase timer bookkeeping -------------------------------------
// Only one phase timer should ever be "live" for a room at a time. Centralizing
// set/clear here prevents the classic bug where a stale timeout fires after
// the phase has already moved on (e.g. a skipped vote racing a hint timeout).

export function setRoomTimer(code: string, timeout: NodeJS.Timeout) {
  clearRoomTimer(code);
  roomTimers.set(code, timeout);
}

export function clearRoomTimer(code: string) {
  const existing = roomTimers.get(code);
  if (existing) {
    clearTimeout(existing);
    roomTimers.delete(code);
  }
}
