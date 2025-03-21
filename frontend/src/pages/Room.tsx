import Header from "@/components/header";
import { RTCDialog } from "@/pages/RTCDialog";
import { copyToClipboard } from "@/helpers";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useAppContext } from "@/Context";
import { RTCCallPage } from "./RTCCallPage";
import { RequestUpdateData, RoomMessageData } from "@/helpers";

export default function Room() {
  const { thisRoomId, socket, setOtherParty, thisUserId } = useAppContext();
  const [messages, setMessages] = useState<RoomMessageData[]>([]);
  const [isRoomFull, setIsRoomFull] = useState(false);

  useEffect(() => {
    if (socket && socket.connected) {
      socket.on("roomUpdate", (response) => {
        setOtherParty(response.otherParty);
        setIsRoomFull(response.isRoomFull);
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
    <div className="border rounded-2xl p-5 w-full shadow-xl bg-white">
      <Header />
      <div className="bg-[#ffeded] border border-[#f3e1e1] text-[#5E548E] flex justify-between my-5 px-4 py-3 rounded-lg">
        <div className="font-semibold flex items-center gap-1">
          Room Code: <span className="font-normal text-[#3B4C5A]">{thisRoomId}</span>
          <Copy className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => copyToClipboard(thisRoomId)} size={16} />
        </div>
        <div className="font-semibold flex items-center gap-1">
          <RTCDialog isRoomFull={isRoomFull} messages={messages} />
        </div>
      </div>
      <RTCCallPage />
    </div>
  );
}
