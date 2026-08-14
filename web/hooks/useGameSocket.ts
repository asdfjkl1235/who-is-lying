"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getSocket,
  saveStoredSession,
  loadStoredSession,
  clearStoredSession,
} from "@/lib/socket";

import {
  PublicRoomState,
  PrivateRoleView,
  Hint,
  RoundResult,
} from "@/types/game";

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

interface AckResult {
  ok: boolean;
  error?: string;

  votes?: number;
  needed?: number;

  [key: string]: unknown;
}

export function useGameSocket() {
  const socket = getSocket();

  const [
    status,
    setStatus,
  ] =
    useState<ConnectionStatus>(
      "connecting"
    );

  const [
    room,
    setRoom,
  ] =
    useState<PublicRoomState | null>(
      null
    );

  const [
    role,
    setRole,
  ] =
    useState<PrivateRoleView | null>(
      null
    );

  const [
    playerId,
    setPlayerId,
  ] =
    useState<string | null>(
      null
    );

  const [
    lastError,
    setLastError,
  ] =
    useState<string | null>(
      null
    );

  const [
    lastRoundResult,
    setLastRoundResult,
  ] =
    useState<RoundResult | null>(
      null
    );

  // -----------------------------------------------------------------------
  // Socket listeners
  // -----------------------------------------------------------------------

  useEffect(() => {
    function onConnect() {
      setStatus(
        "connected"
      );

      const stored =
        loadStoredSession();

      if (!stored)
        return;

      socket.emit(
        "session:resume",
        {
          sessionToken:
            stored.sessionToken,
        },
        (
          res: AckResult
        ) => {
          if (res.ok) {
            setPlayerId(
              stored.playerId
            );
          } else {
            clearStoredSession();
          }
        }
      );
    }

    function onDisconnect() {
      setStatus(
        "disconnected"
      );
    }

    function onRoomUpdate(
      state: PublicRoomState
    ) {
      setRoom(state);
    }

    function onRole(
      view: PrivateRoleView
    ) {
      setRole(view);
    }

    function onHintNew(
      _hint: Hint
    ) {
      // room:update contains the full hints array.
    }

    function onVoteResult(
      result: RoundResult
    ) {
      setLastRoundResult(
        result
      );
    }

    function onError(
      payload: {
        code: string;
        message: string;
      }
    ) {
      setLastError(
        payload.message
      );
    }

    socket.on(
      "connect",
      onConnect
    );

    socket.on(
      "disconnect",
      onDisconnect
    );

    socket.on(
      "room:update",
      onRoomUpdate
    );

    socket.on(
      "game:role",
      onRole
    );

    socket.on(
      "hint:new",
      onHintNew
    );

    socket.on(
      "vote:result",
      onVoteResult
    );

    socket.on(
      "error",
      onError
    );

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      socket.off(
        "connect",
        onConnect
      );

      socket.off(
        "disconnect",
        onDisconnect
      );

      socket.off(
        "room:update",
        onRoomUpdate
      );

      socket.off(
        "game:role",
        onRole
      );

      socket.off(
        "hint:new",
        onHintNew
      );

      socket.off(
        "vote:result",
        onVoteResult
      );

      socket.off(
        "error",
        onError
      );
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -----------------------------------------------------------------------
  // Create room
  // -----------------------------------------------------------------------

  const createRoom =
    useCallback(
      (
        username: string
      ) => {
        return new Promise<AckResult>(
          (resolve) => {
            socket.emit(
              "room:create",
              {
                username,
              },
              (
                res: AckResult
              ) => {
                if (res.ok) {
                  setPlayerId(
                    res.playerId as string
                  );

                  saveStoredSession({
                    sessionToken:
                      res.sessionToken as string,

                    roomCode:
                      res.roomCode as string,

                    playerId:
                      res.playerId as string,

                    username,
                  });
                }

                resolve(res);
              }
            );
          }
        );
      },
      [socket]
    );

  // -----------------------------------------------------------------------
  // Join room
  // -----------------------------------------------------------------------

  const joinRoom =
    useCallback(
      (
        username: string,
        code: string
      ) => {
        return new Promise<AckResult>(
          (resolve) => {
            socket.emit(
              "room:join",
              {
                username,
                code,
              },
              (
                res: AckResult
              ) => {
                if (res.ok) {
                  setPlayerId(
                    res.playerId as string
                  );

                  saveStoredSession({
                    sessionToken:
                      res.sessionToken as string,

                    roomCode:
                      res.roomCode as string,

                    playerId:
                      res.playerId as string,

                    username,
                  });
                }

                resolve(res);
              }
            );
          }
        );
      },
      [socket]
    );

  // -----------------------------------------------------------------------
  // Ready
  // -----------------------------------------------------------------------

  const setReady =
    useCallback(
      (
        ready: boolean
      ) => {
        socket.emit(
          "player:ready",
          {
            ready,
          }
        );
      },
      [socket]
    );

  // -----------------------------------------------------------------------
  // Start game
  // -----------------------------------------------------------------------

  const startGame =
    useCallback(() => {
      socket.emit(
        "game:start"
      );
    }, [socket]);

  // -----------------------------------------------------------------------
  // Submit hint
  // -----------------------------------------------------------------------

  const submitHint =
    useCallback(
      (
        text: string
      ) => {
        return new Promise<AckResult>(
          (resolve) => {
            socket.emit(
              "hint:submit",
              {
                text,
              },
              (
                res: AckResult
              ) => {
                resolve(res);
              }
            );
          }
        );
      },
      [socket]
    );

  // -----------------------------------------------------------------------
  // SKIP DISCUSSION
  // -----------------------------------------------------------------------

  const skipDiscussion =
    useCallback(() => {
      /*
       * IMPORTANT:
       * This returns a Promise.
       *
       * This fixes:
       *
       * TypeError: t.then is not a function
       */
      return new Promise<AckResult>(
        (resolve) => {
          socket.emit(
            "discussion:skip",
            (
              res: AckResult
            ) => {
              resolve(res);
            }
          );
        }
      );
    }, [socket]);

  // -----------------------------------------------------------------------
  // Submit vote
  // -----------------------------------------------------------------------

  const submitVote =
    useCallback(
      (
        targetId:
          | string
          | null
      ) => {
        return new Promise<AckResult>(
          (resolve) => {
            socket.emit(
              "vote:submit",
              {
                targetId,
              },
              (
                res: AckResult
              ) => {
                resolve(res);
              }
            );
          }
        );
      },
      [socket]
    );

  // -----------------------------------------------------------------------
  // Rematch
  // -----------------------------------------------------------------------

  const requestRematch =
    useCallback(() => {
      socket.emit(
        "game:rematch"
      );
    }, [socket]);

  // -----------------------------------------------------------------------
  // Leave
  // -----------------------------------------------------------------------

  const leaveRoom =
    useCallback(() => {
      socket.emit(
        "room:leave"
      );

      clearStoredSession();

      setRoom(null);
      setRole(null);
      setPlayerId(null);
    }, [socket]);

  // -----------------------------------------------------------------------
  // Error
  // -----------------------------------------------------------------------

  const clearError =
    useCallback(
      () =>
        setLastError(null),
      []
    );

  return {
    status,

    room,

    role,

    playerId,

    lastError,

    lastRoundResult,

    createRoom,

    joinRoom,

    setReady,

    startGame,

    submitHint,

    skipDiscussion,

    submitVote,

    requestRematch,

    leaveRoom,

    clearError,
  };
}