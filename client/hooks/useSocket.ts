"use client";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { SOCKET_EVENTS } from "@taskflow/shared";
import { useProjectStore } from "@/store/projectStore";

export const useSocket = (projectId: string): void => {
  const setOnlineUserIds = useProjectStore((s) => s.setOnlineUserIds);

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    socket.emit(SOCKET_EVENTS.PROJECT_JOIN, projectId);

    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, ({ onlineUserIds }: { onlineUserIds: string[] }) => {
      setOnlineUserIds(onlineUserIds);
    });

    return () => {
      socket.emit(SOCKET_EVENTS.PROJECT_LEAVE, projectId);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE);
    };
  }, [projectId, setOnlineUserIds]);
};
