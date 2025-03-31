import { Phone } from "lucide-react";
import { Button } from "./ui/button";
import { useAppContext } from "@/Context";

export function EndCall({
  localFeedEl,
  remoteFeedEl,
  setShowInCallUI,
  peerConnection,
}: {
  localFeedEl: React.RefObject<HTMLVideoElement>;
  remoteFeedEl: React.RefObject<HTMLVideoElement>;
  setShowInCallUI: (inCallUI: boolean) => void;
  peerConnection: RTCPeerConnection | null;
}) {
  const { socket } = useAppContext();
  const endCall = () => {
    if (peerConnection) {
      peerConnection.close();
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
    }
    if (socket && socket.connected) {
      console.log("callEnded emmitted");
      socket.emit("callEnded");
    }

    //set both video tags to empty
    if (localFeedEl.current) {
      localFeedEl.current.srcObject = null;
    }
    if (remoteFeedEl.current) {
      remoteFeedEl.current.srcObject = null;
    }
    setShowInCallUI(false);
  };

  return (
    <div className="flex">
      <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={endCall}>
        <Phone className="rotate-[135deg]" />
        End Call
      </Button>
    </div>
  );
}
