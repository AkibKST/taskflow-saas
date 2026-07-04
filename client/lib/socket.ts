import { io, Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { useAuthStore } from "@/store/authStore";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (socket?.connected) return socket;

  const { accessToken } = useAuthStore.getState();

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });

  // The server severs realtime access when the account is deactivated or its
  // role changes — log out immediately rather than lingering with stale access.
  socket.on(SOCKET_EVENTS.SESSION_REVOKED, () => {
    useAuthStore.getState().clearAuth();
    disconnectSocket();
    if (typeof window !== "undefined") window.location.href = "/login";
  });

  return socket;
};

export const disconnectSocket = (): void => {
  socket?.disconnect();
  socket = null;
};
