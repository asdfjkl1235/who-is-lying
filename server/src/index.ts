import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socketHandlers";
import { redisEnabled } from "./redis";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "*";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.get("/health", (_req, res) => {
  res.json({ ok: true, redis: redisEnabled() });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[who-is-lying] server listening on :${PORT}`);
  console.log(`[who-is-lying] client origin: ${CLIENT_ORIGIN}`);
  console.log(`[who-is-lying] redis persistence: ${redisEnabled() ? "enabled" : "disabled (in-memory only)"}`);
});
