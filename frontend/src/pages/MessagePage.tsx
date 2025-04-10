import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppContext } from "@/Context";
import { ClientToServerEvents, MessageData, RoomMessageData, ServerToClientEvents } from "@/helpers";
import { SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

export function MessagePage({ isRoomFull, messages }: { isRoomFull: boolean; messages: RoomMessageData[] }) {
  const [userInput, setUserInput] = useState("");
  const { socket, otherPartySocketId } = useAppContext();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <>
      <div className="border roomcontent-container-colors rounded-lg h-96 overflow-auto">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full roomcontent-container-text italic">
            {!isRoomFull ? "All quiet here. Waiting for your partner to join! 🌟👥" : "No messages yet. Let’s chat! ✨💬"}
          </div>
        )}
        {messages.map((m, ind) => (
          <Message userId={m.userId} userName={m.userName} message={m.message} key={ind} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex w-full mt-3 mb-1 items-center space-x-2">
        <Input
          className="px-4 py-2 border rounded-lg input-style1"
          type="text"
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type a message..."
          value={userInput}
          disabled={!isRoomFull}
        />
        <Button
          type="button"
          className="btn-style4 font-semibold px-8 py-2 rounded-lg shadow"
          onClick={() => sendMessage(otherPartySocketId, userInput, setUserInput, socket)}
          disabled={!isRoomFull || !userInput.length}
        >
          <SendHorizontal />
        </Button>
      </div>
    </>
  );
}

function sendMessage(
  otherParty: string,
  userInput: string,
  setUserInput: (message: string) => void,
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null,
) {
  if (!socket || socket.disconnected) {
    return;
  }
  const messageData: MessageData = {
    eventType: "user",
    otherParty,
    message: userInput,
  };
  socket.emit("sendMessage", messageData);
  setUserInput("");
}

function Message({ userId, userName, message }: { userId: string; userName: string; message: string }) {
  const { thisUserId } = useAppContext();
  const thisUser = userId === thisUserId;

  return (
    <>
      {thisUser ? (
        <div className="flex justify-end p-3">
          <div className="flex flex-col">
            <div className="text-xs text-end pb-1">
              <span>me</span>
            </div>
            <div className="msg-outgoing px-3 py-1 rounded-lg max-w-80">{message}</div>
          </div>
        </div>
      ) : (
        <div className="flex p-3">
          <div className="flex flex-col">
            <div className="text-xs pb-1">
              <span>{userName}</span>
            </div>
            <div className="msg-incoming px-3 py-1 rounded-lg max-w-80">{message}</div>
          </div>
        </div>
      )}
    </>
  );
}
