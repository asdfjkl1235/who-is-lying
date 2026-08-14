"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameSocket } from "@/hooks/useGameSocket";

export default function CreateGamePage() {
  const router = useRouter();
  const { createRoom } = useGameSocket();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    const res = await createRoom(username.trim());
    setLoading(false);
    if (res.ok) {
      router.push(`/room/${res.roomCode}`);
    } else {
      setError(res.error ?? "Couldn't create a room. Try again.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <form onSubmit={handleCreate} className="glass-card mx-auto flex w-full max-w-sm flex-col gap-5 rounded-2xl p-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Create Game</h1>
          <p className="mt-1 text-sm text-white/40">4–20 players. You'll be the host.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/40">Your Name</label>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            placeholder="Noor"
            className="input-field"
          />
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <button type="submit" className="btn-primary w-full" disabled={!username.trim() || loading}>
          {loading ? "Creating…" : "Create Room"}
        </button>

        <Link href="/" className="text-center text-sm text-white/40 hover:text-white/70">
          ← Back
        </Link>
      </form>
    </main>
  );
}
