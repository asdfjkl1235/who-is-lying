"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PrivateRoleView, PublicRoomState } from "@/types/game";
import Timer from "./Timer";

export default function RoleReveal({ role, room }: { role: PrivateRoleView | null; room: PublicRoomState }) {
  if (!role) {
    return (
      <div className="flex h-64 items-center justify-center text-white/40">
        Waiting for your role…
      </div>
    );
  }

  const isImposter = role.role === "imposter";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={role.role}
          initial={{ opacity: 0, scale: 0.85, rotateX: -20 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`glass-card w-full rounded-3xl p-8 shadow-glow ${
            isImposter ? "border-red-500/30" : "border-emerald-500/20"
          }`}
        >
          <div className="text-4xl">{isImposter ? "😈" : "🕵️"}</div>
          <h2 className={`mt-4 text-2xl font-bold ${isImposter ? "text-red-300" : "text-emerald-300"}`}>
            {isImposter ? "YOU ARE THE IMPOSTER" : "YOU ARE A DETECTIVE"}
          </h2>

          <div className="mt-6 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">Category</div>
              <div className="text-xl font-semibold text-white">{role.category}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/40">Secret Word</div>
              <div className="text-2xl font-bold text-white">{role.word ?? "???"}</div>
            </div>
          </div>

          <p className="mt-6 text-sm text-white/50">
            {isImposter
              ? "You don't know the word. Blend in and figure it out from the hints."
              : "Find the player who doesn't actually know the word."}
          </p>
        </motion.div>
      </AnimatePresence>
      <Timer endsAt={room.phaseEndsAt} totalSeconds={room.settings.roleRevealSeconds} label="Round starting in" />
    </div>
  );
}
