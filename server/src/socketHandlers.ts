import { Server, Socket } from "socket.io";

import {
  getRoom,
  saveRoom,
  deleteRoom,
  getSession,
  saveSession,
  generateSessionToken,
} from "./store";

import {
  createRoom,
  canJoinRoom,
  addPlayer,
  removePlayer,
  canStartGame,
} from "./rooms";

import {
  startGame,
  submitHint,
  submitVote,
  submitDiscussionSkip,
  rematch,
  broadcastRoomState,
  handleImposterDisconnect,
  projectPublicState,
} from "./gameEngine";

import {
  GameRoom,
  PrivateRoleView,
} from "./types";

const RECONNECT_GRACE_MS = 45_000;

const reconnectTimers =
  new Map<string, NodeJS.Timeout>();

function sendError(
  socket: Socket,
  message: string,
  code = "error"
) {
  socket.emit("error", {
    code,
    message,
  });
}

function currentRoleView(
  room: GameRoom,
  playerId: string
): PrivateRoleView | null {
  if (
    !room.category ||
    room.phase === "lobby"
  ) {
    return null;
  }

  if (
    playerId === room.imposterId
  ) {
    return {
      role: "imposter",
      category: room.category,
      word: null,
    };
  }

  if (room.secretWord) {
    return {
      role: "detective",
      category: room.category,
      word: room.secretWord,
    };
  }

  return null;
}

function sendFullStateTo(
  io: Server,
  socket: Socket,
  room: GameRoom,
  playerId: string
) {
  socket.emit(
    "room:update",
    projectPublicState(room)
  );

  const role =
    currentRoleView(
      room,
      playerId
    );

  if (role) {
    socket.emit(
      "game:role",
      role
    );
  }
}

export function registerSocketHandlers(
  io: Server
) {
  io.on(
    "connection",
    (socket: Socket) => {
      socket.data.playerId = null;
      socket.data.roomCode = null;

      // ---------------------------------------------------------------
      // room:create
      // ---------------------------------------------------------------

      socket.on(
        "room:create",
        (
          payload: {
            username: string;
          },
          ack?: Function
        ) => {
          const username =
            (
              payload?.username ??
              ""
            ).trim();

          if (!username) {
            return ack?.({
              ok: false,
              error:
                "Enter a username.",
            });
          }

          const {
            room,
            hostPlayer,
          } = createRoom(
            username
          );

          hostPlayer.socketId =
            socket.id;

          saveRoom(room);

          const sessionToken =
            generateSessionToken();

          saveSession(
            sessionToken,
            room.code,
            hostPlayer.id
          );

          socket.data.playerId =
            hostPlayer.id;

          socket.data.roomCode =
            room.code;

          socket.join(room.code);

          ack?.({
            ok: true,
            roomCode: room.code,
            playerId:
              hostPlayer.id,
            sessionToken,
          });

          broadcastRoomState(
            io,
            room
          );
        }
      );

      // ---------------------------------------------------------------
      // room:join
      // ---------------------------------------------------------------

      socket.on(
        "room:join",
        (
          payload: {
            username: string;
            code: string;
          },
          ack?: Function
        ) => {
          const username =
            (
              payload?.username ??
              ""
            ).trim();

          const code =
            (
              payload?.code ??
              ""
            )
              .trim()
              .toUpperCase();

          if (!username) {
            return ack?.({
              ok: false,
              error:
                "Enter a username.",
            });
          }

          const room =
            getRoom(code);

          const joinError =
            canJoinRoom(room);

          if (joinError) {
            const messages: Record<
              string,
              string
            > = {
              room_not_found:
                "That room code doesn't exist.",

              room_full:
                "That room is full.",

              game_already_started:
                "That game has already started.",

              invalid_username:
                "Enter a valid username.",
            };

            return ack?.({
              ok: false,
              error:
                messages[
                  joinError
                ],
            });
          }

          const player =
            addPlayer(
              room!,
              username
            );

          player.socketId =
            socket.id;

          saveRoom(room!);

          const sessionToken =
            generateSessionToken();

          saveSession(
            sessionToken,
            room!.code,
            player.id
          );

          socket.data.playerId =
            player.id;

          socket.data.roomCode =
            room!.code;

          socket.join(
            room!.code
          );

          ack?.({
            ok: true,
            roomCode:
              room!.code,
            playerId:
              player.id,
            sessionToken,
          });

          broadcastRoomState(
            io,
            room!
          );
        }
      );

      // ---------------------------------------------------------------
      // session:resume
      // ---------------------------------------------------------------

      socket.on(
        "session:resume",
        (
          payload: {
            sessionToken: string;
          },
          ack?: Function
        ) => {
          const session =
            getSession(
              payload?.sessionToken ??
                ""
            );

          if (!session) {
            return ack?.({
              ok: false,
              error:
                "Session expired.",
            });
          }

          const room =
            getRoom(
              session.roomCode
            );

          if (!room) {
            return ack?.({
              ok: false,
              error:
                "Room no longer exists.",
            });
          }

          const player =
            room.players.find(
              (p) =>
                p.id ===
                session.playerId
            );

          if (!player) {
            return ack?.({
              ok: false,
              error:
                "You're no longer in that room.",
            });
          }

          const timerKey =
            `${room.code}:${player.id}`;

          const pending =
            reconnectTimers.get(
              timerKey
            );

          if (pending) {
            clearTimeout(
              pending
            );

            reconnectTimers.delete(
              timerKey
            );
          }

          player.socketId =
            socket.id;

          player.connected = true;

          socket.data.playerId =
            player.id;

          socket.data.roomCode =
            room.code;

          socket.join(
            room.code
          );

          ack?.({
            ok: true,
            roomCode:
              room.code,
            playerId:
              player.id,
          });

          sendFullStateTo(
            io,
            socket,
            room,
            player.id
          );

          broadcastRoomState(
            io,
            room
          );
        }
      );

      // ---------------------------------------------------------------
      // player:ready
      // ---------------------------------------------------------------

      socket.on(
        "player:ready",
        (
          payload: {
            ready: boolean;
          }
        ) => {
          const room =
            requireRoom(
              socket
            );

          if (
            !room ||
            room.phase !==
              "lobby"
          ) {
            return;
          }

          const player =
            room.players.find(
              (p) =>
                p.id ===
                socket.data
                  .playerId
            );

          if (!player) {
            return;
          }

          if (player.isHost) {
            return;
          }

          player.ready =
            !!payload?.ready;

          broadcastRoomState(
            io,
            room
          );
        }
      );

      // ---------------------------------------------------------------
      // game:start
      // ---------------------------------------------------------------

      socket.on(
        "game:start",
        () => {
          const room =
            requireRoom(
              socket
            );

          if (!room) {
            return;
          }

          if (
            room.hostId !==
            socket.data.playerId
          ) {
            return sendError(
              socket,
              "Only the host can start the game."
            );
          }

          if (
            room.phase !==
            "lobby"
          ) {
            return;
          }

          const check =
            canStartGame(
              room
            );

          if (!check.ok) {
            return sendError(
              socket,
              check.reason!,
              "cannot_start"
            );
          }

          startGame(
            io,
            room
          );
        }
      );

      // ---------------------------------------------------------------
      // hint:submit
      // ---------------------------------------------------------------

      socket.on(
        "hint:submit",
        (
          payload: {
            text: string;
          },
          ack?: Function
        ) => {
          const room =
            requireRoom(
              socket
            );

          if (!room) {
            return ack?.({
              ok: false,
              error:
                "Not in a room.",
            });
          }

          const result =
            submitHint(
              io,
              room,
              socket.data
                .playerId,
              payload?.text ??
                ""
            );

          ack?.(result);
        }
      );

      // ---------------------------------------------------------------
      // discussion:skip
      // ---------------------------------------------------------------

      socket.on(
        "discussion:skip",
        (
          ack?: Function
        ) => {
          const room =
            requireRoom(
              socket
            );

          if (!room) {
            return ack?.({
              ok: false,
              error:
                "Not in a room.",
            });
          }

          const result =
            submitDiscussionSkip(
              io,
              room,
              socket.data
                .playerId
            );

          ack?.(result);
        }
      );

      // ---------------------------------------------------------------
      // vote:submit
      // ---------------------------------------------------------------

      socket.on(
        "vote:submit",
        (
          payload: {
            targetId:
              | string
              | null;
          },
          ack?: Function
        ) => {
          const room =
            requireRoom(
              socket
            );

          if (!room) {
            return ack?.({
              ok: false,
              error:
                "Not in a room.",
            });
          }

          const result =
            submitVote(
              io,
              room,
              socket.data
                .playerId,
              payload?.targetId ??
                null
            );

          ack?.(result);
        }
      );

      // ---------------------------------------------------------------
      // game:rematch
      // ---------------------------------------------------------------

      socket.on(
        "game:rematch",
        () => {
          const room =
            requireRoom(
              socket
            );

          if (!room) {
            return;
          }

          if (
            room.hostId !==
            socket.data.playerId
          ) {
            return sendError(
              socket,
              "Only the host can start a rematch."
            );
          }

          if (
            room.phase !==
            "finished"
          ) {
            return;
          }

          rematch(
            io,
            room
          );
        }
      );

      // ---------------------------------------------------------------
      // room:leave
      // ---------------------------------------------------------------

      socket.on(
        "room:leave",
        () => {
          handleLeave(
            io,
            socket
          );
        }
      );

      // ---------------------------------------------------------------
      // disconnect
      // ---------------------------------------------------------------

      socket.on(
        "disconnect",
        () => {
          handleDisconnect(
            io,
            socket
          );
        }
      );
    }
  );
}

function requireRoom(
  socket: Socket
): GameRoom | null {
  const code =
    socket.data.roomCode;

  if (!code) {
    return null;
  }

  return (
    getRoom(code) ??
    null
  );
}

function handleLeave(
  io: Server,
  socket: Socket
) {
  const room =
    requireRoom(socket);

  if (!room) {
    return;
  }

  const playerId =
    socket.data.playerId;

  removePlayer(
    room,
    playerId
  );

  socket.leave(
    room.code
  );

  socket.data.roomCode =
    null;

  socket.data.playerId =
    null;

  if (
    room.players.length ===
    0
  ) {
    deleteRoom(
      room.code
    );

    return;
  }

  broadcastRoomState(
    io,
    room
  );
}

function handleDisconnect(
  io: Server,
  socket: Socket
) {
  const room =
    requireRoom(socket);

  if (!room) {
    return;
  }

  const playerId =
    socket.data.playerId as
      | string
      | null;

  if (!playerId) {
    return;
  }

  const player =
    room.players.find(
      (p) => p.id === playerId
    );

  if (!player) {
    return;
  }

  // Lobby disconnects are permanent.
  if (
    room.phase ===
    "lobby"
  ) {
    removePlayer(
      room,
      playerId
    );

    if (
      room.players.length ===
      0
    ) {
      deleteRoom(
        room.code
      );

      return;
    }

    broadcastRoomState(
      io,
      room
    );

    return;
  }

  // Active game.
  player.connected = false;

  player.socketId = null;

  // Remove disconnected player from skip votes.
  room.discussionSkipVotes =
    room.discussionSkipVotes.filter(
      (id) =>
        id !== playerId
    );

  broadcastRoomState(
    io,
    room
  );

  const timerKey =
    `${room.code}:${playerId}`;

  const timeout =
    setTimeout(() => {
      reconnectTimers.delete(
        timerKey
      );

      const stillRoom =
        getRoom(room.code);

      if (!stillRoom) {
        return;
      }

      const stillPlayer =
        stillRoom.players.find(
          (p) =>
            p.id ===
            playerId
        );

      if (
        !stillPlayer ||
        stillPlayer.connected
      ) {
        return;
      }

      if (
        stillPlayer.id ===
          stillRoom.imposterId &&
        stillRoom.phase !==
          "finished"
      ) {
        handleImposterDisconnect(
          io,
          stillRoom
        );

        return;
      }

      broadcastRoomState(
        io,
        stillRoom
      );
    }, RECONNECT_GRACE_MS);

  reconnectTimers.set(
    timerKey,
    timeout
  );
}