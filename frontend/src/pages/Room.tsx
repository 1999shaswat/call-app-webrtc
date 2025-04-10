import Header from "@/components/header";
import { ChatDialog } from "@/pages/ChatDialog";
import { copyToClipboard } from "@/helpers";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAppContext } from "@/Context";
import { RTCCallPage } from "./RTCCallPage";
import { RequestUpdateData, RoomMessageData } from "@/helpers";
import { RtcProvider } from "@/RtcContext";

export default function Room() {
  const { thisRoomId, socket, setOtherPartySocketId, thisUserId } = useAppContext();
  const [messages, setMessages] = useState<RoomMessageData[]>([]);
  const [isRoomFull, setIsRoomFull] = useState(false);

  useEffect(() => {
    if (socket && socket.connected) {
      socket.on("roomUpdate", (response) => {
        setOtherPartySocketId(response.otherParty);
        setIsRoomFull(response.isRoomFull);
        if (response.showMessage) {
          toast.info(response.isRoomFull ? "User Joined" : "User Left");
        }
      });
      socket.on("roomMessage", (response) => {
        if (response.userId != thisUserId) {
          toast.info("New Message");
        }

        setMessages((m) => [...m, response]);
      });
      const req: RequestUpdateData = { roomId: thisRoomId };
      socket.emit("requestRoomUpdate", req);
    }
    return () => {
      if (socket) {
        socket.offAny();
      }
    };
  }, [socket]);

  return (
    <div className="border rounded-2xl p-5 w-full shadow-xl containerbg-colors">
      <Header />
      <div className="room-codesection-colors border flex justify-between my-5 px-4 py-3 rounded-lg">
        <div className="font-semibold flex items-center gap-1">
          Room Code: <span className="font-normal room-codesection-roomId">{thisRoomId}</span>
          <Copy className="cursor-pointer copy-btn" onClick={() => copyToClipboard(thisRoomId)} size={16} />
        </div>
        <div className="font-semibold flex items-center gap-1">
          <ChatDialog isRoomFull={isRoomFull} messages={messages} />
        </div>
      </div>
      <RtcProvider>
        <RTCCallPage isRoomFull={isRoomFull}/>
      </RtcProvider>
    </div>
  );
}
