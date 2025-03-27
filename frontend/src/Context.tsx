import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./helpers";

// Define the context type
interface AppContextType {
  thisUserId: string;
  setThisUserId: (userId: string) => void;
  thisRoomId: string;
  setThisRoomId: (roomId: string) => void;
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  otherPartySocketId: string;
  setOtherPartySocketId: (socketId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState("");
  const [thisRoomId, setThisRoomId] = useState("");
  const [otherParty, setOtherParty] = useState("");
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    const s = io("https://192.168.29.91:8000");
    console.log("connecting");

    setSocket(s);
    return () => {
      if (s.connected) {
        s.disconnect();
        console.log("Socket disconnected");
      }
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        thisUserId: userId,
        setThisUserId: setUserId,
        thisRoomId,
        setThisRoomId,
        socket,
        otherPartySocketId: otherParty,
        setOtherPartySocketId: setOtherParty,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
