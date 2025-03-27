import Header from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/Context";
import { ClientToServerEvents, copyToClipboard, ServerToClientEvents } from "@/helpers";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";

export default function Home({ setView }: { setView: (view: "home" | "room") => void }) {
  const { setThisUserId, thisRoomId, setThisRoomId, socket } = useAppContext();

  const [roomIdInput, setRoomIdInput] = useState("");
  const [userNameInput, setUserNameInput] = useState("");
  useEffect(() => {
    if (socket) {
      socket.on("connect", () => {
        toast.success("Connected Successfully");
        socket.emit("getUserId");
      });
      socket.on("setUserId", (response) => setThisUserId(response.userId));
      socket.on("setRoomId", (response) => {
        setThisRoomId(response.roomId);
        setRoomIdInput(response.roomId);
      });
      socket.on("joinRoom", (response) => {
        if (response.status === "error") {
          toast.error(response.message);
          return;
        }
        setThisRoomId(response.roomId);
        toast.success(response.message);
        setView("room");
      });
    }
    return () => {
      if (socket) {
        socket.offAny();
      }
    };
  }, [socket]);
  return (
    <div className="border rounded-2xl p-5 w-full shadow-xl bg-white">
      <Header />
      <Button
        type="button"
        onClick={() => {
          if (!socket) {
            return;
          }

          socket.emit("createRoom");
        }}
        className="bg-[#ded1f6] hover:bg-[#cabae9] text-[#5E548E] font-semibold py-6 mt-5 mb-6 w-full text-lg rounded-lg shadow"
        disabled={thisRoomId.length > 0}
      >
        Create New Room
      </Button>
      <Input
        type="text"
        className="px-4 py-2 border border-[#E4E7EB] rounded-lg text-[#3B4C5A] mb-3"
        onChange={(e) => setUserNameInput(e.target.value)}
        placeholder="Name"
      />
      <div className="flex gap-2 mb-3">
        <Input
          type="text"
          className="px-4 py-2 border border-[#E4E7EB] rounded-lg text-[#3B4C5A]"
          onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
          placeholder="Room code"
          value={roomIdInput}
        />
        <Button
          type="button"
          onClick={() => {
            joinRoom(socket, userNameInput, roomIdInput);
          }}
          className="bg-[#F2C6D2] hover:bg-[#ebb0c0] text-[#5E4B57] font-semibold px-8"
        >
          Join Room
        </Button>
      </div>
      {thisRoomId.length > 0 && (
        <div className="flex flex-col justify-center items-center w-full mt-2 p-6  bg-[#dff7e8] text-[#3b5a4b] rounded-lg">
          <span className="text-muted-foreground mb-2">Share this code with your friend</span>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-600">{thisRoomId}</div>
            <Copy className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => copyToClipboard(thisRoomId)} />
          </div>
        </div>
      )}
    </div>
  );
}

function joinRoom(socket: Socket<ServerToClientEvents, ClientToServerEvents> | null, userName: string, roomId: string) {
  if (!socket) {
    return;
  }
  socket.emit("joinRoom", { userName, roomId });
}
