# Who Is Lying?

A real-time multiplayer social deduction party game built for Discord friend
groups. One secret word, one Imposter who doesn't know it — everyone else
gives hints, discusses over voice chat, and votes them out.

```
SECRET WORD → HINTS → DISCUSSION → VOTE → REVEAL → WIN/LOSE
```

This is a **fully server-authoritative** game: the browser is a dumb
renderer of state the server sends it. The Imposter's browser never
receives the secret word — not hidden with CSS, not sent-then-hidden, never
sent at all.

## Architecture

Two independently deployable services:

```
/server   Node.js + Express + Socket.IO + TypeScript
          Owns all game state, timers, roles, hints, votes.
          In-memory store by default; optional Redis write-through
          persistence for room/session state.

/web      Next.js 14 (App Router) + React + TypeScript + Tailwind + Framer Motion
          Pure client of the server's Socket.IO events. Renders whatever
          phase the server says the room is in.
```

They talk over Socket.IO (WebSocket, with polling fallback) — see
`server/src/socketHandlers.ts` for the full event contract and
`web/hooks/useGameSocket.ts` for the client side of it.

## Running locally

You'll need Node.js 18+.

```bash
# Terminal 1 — backend
cd server
npm install
cp .env.example .env      # defaults are fine for local dev
npm run dev                # -> http://localhost:4000

# Terminal 2 — frontend
cd web
npm install
cp .env.example .env.local # points at http://localhost:4000 by default
npm run dev                 # -> http://localhost:3000
```

Open `http://localhost:3000` in a few different browser tabs (or share your
local network IP with friends on the same network) to test a full game with
4+ players.

## Deploying

- **Frontend (`/web`)** → Vercel. Set `NEXT_PUBLIC_SERVER_URL` to your
  deployed backend's URL.
- **Backend (`/server`)** → Railway, Render, or Fly.io. Set `CLIENT_ORIGIN`
  to your deployed frontend's URL (for CORS + Socket.IO), and optionally
  `REDIS_URL` (Redis Cloud or Upstash) if you want room/session state to
  survive a process restart.

## How the game works

1. Host creates a room, gets a 5-character room code, shares it in Discord.
2. Friends join from their own browsers with that code and a username.
3. Everyone readies up; the host starts the game once there are at least 4
   players.
4. The server privately picks a category, a secret word, and exactly one
   Imposter — Detectives get the word, the Imposter doesn't.
5. Players take turns giving one hint each (15s per turn) without saying the
   word.
6. A 30-second discussion phase follows (talk it out over Discord voice).
7. Everyone votes for who they think the Imposter is, or votes to skip.
8. **Skip or a tie** → another hint round with the *same* word and Imposter.
9. **A player is voted out** → if it was the Imposter, Detectives win; if
   not, the Imposter wins. Either way, the word and Imposter are revealed.
10. Host can start a rematch with the same players — new category, word,
    and Imposter.

## Key implementation notes

- **Server-authoritative everything**: role, word, imposter identity, turn
  order, timers, vote tallies, and the winner are all computed and held on
  the server (`server/src/gameEngine.ts`). The client only ever *requests*
  actions (`hint:submit`, `vote:submit`, ...) and the server validates them
  (whose turn is it, is the hint valid, has this player already voted, ...)
  before applying anything.
- **Information separation**: `gameEngine.ts`'s `projectPublicState()` is
  the single function that turns internal room state into what gets
  broadcast to everyone. The secret word only ever goes out through a
  private, per-socket `game:role` event, and only to Detectives.
- **No client-trusted timers**: every phase carries a server-computed
  `phaseEndsAt` timestamp; the client just renders `phaseEndsAt - Date.now()`
  every tick, so timers never drift out of sync between players.
- **Reconnection**: joining/creating a room issues a session token (stored
  in `sessionStorage`, not `localStorage`/cookies) that can be redeemed via
  `session:resume` to reclaim your seat, role, and current phase after a
  dropped connection — without ever re-exposing role info to the wrong
  player.
- **Hint validation** (`server/src/hints.ts`) runs only on the server and
  rejects hints that are or contain the secret word, while allowing
  thematically related hints.
