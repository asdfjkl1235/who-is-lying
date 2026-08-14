"use client";

export default function ConnectionStatus({ status }: { status: "connecting" | "connected" | "disconnected" }) {
  const isConnected = status === "connected";
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-base-900/80 px-3 py-1.5 text-xs text-white/70 backdrop-blur">
      <span
        className={`h-2 w-2 rounded-full ${
          isConnected ? "bg-emerald-400" : "bg-red-400 animate-pulse"
        }`}
      />
      {isConnected ? "Connected" : status === "connecting" ? "Connecting..." : "Reconnecting..."}
    </div>
  );
}
