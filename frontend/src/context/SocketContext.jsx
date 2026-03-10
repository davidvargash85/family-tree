import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setSocket((prev) => {
        if (prev) prev.disconnect();
        return null;
      });
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    const s = io(window.location.origin, { auth: { token } });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

/** Join tree room and subscribe to publication:created / comment:created; invalidate queries. Call from TimelinePage (or any tree view). */
export function useTreeSocket(treeId) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !treeId || !user) return;

    const join = () => socket.emit("joinTree", treeId);
    join();
    socket.on("connect", join);

    const onPublicationCreated = () => {
      queryClient.invalidateQueries({ queryKey: ["publications", treeId] });
      queryClient.invalidateQueries({ queryKey: ["treePhotos", treeId] });
    };

    const onCommentCreated = ({ publicationId }) => {
      if (publicationId) {
        queryClient.invalidateQueries({ queryKey: ["comments", treeId, publicationId] });
      }
    };

    socket.on("publication:created", onPublicationCreated);
    socket.on("comment:created", onCommentCreated);

    return () => {
      socket.off("connect", join);
      socket.emit("leaveTree", treeId);
      socket.off("publication:created", onPublicationCreated);
      socket.off("comment:created", onCommentCreated);
    };
  }, [socket, treeId, user, queryClient]);
}
