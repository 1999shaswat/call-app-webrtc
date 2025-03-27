import { Phone } from "lucide-react";
import { Button } from "./ui/button";
import { CallStatusType } from "@/RtcContext";

export function EndCall({
  callStatus,
  localFeedEl,
  remoteFeedEl,
  updateCallStatus,
  peerConnection,
  setShowInCallUI,
}: {
  callStatus: CallStatusType;
  localFeedEl: React.RefObject<HTMLVideoElement>;
  remoteFeedEl: React.RefObject<HTMLVideoElement>;
  updateCallStatus: (cs: CallStatusType) => void;
  peerConnection: RTCPeerConnection | null;
  setShowInCallUI: (inCallUI: boolean) => void;
}) {
  const endCall = () => {
    if (peerConnection) {
      const copyCS = { ...callStatus };
      copyCS.inCall = false;
      //user has clicked hang up. pc:
      //close it
      //remove listeners
      //set it to null
      peerConnection.close();

      peerConnection.onicecandidate = null;
      peerConnection.onaddstream = null;
      peerConnection = null;
      //set both video tags to empty
      if (localFeedEl.current) {
        localFeedEl.current.srcObject = null;
      }
      if (remoteFeedEl.current) {
        remoteFeedEl.current.srcObject = null;
      }
      updateCallStatus(copyCS);
      setShowInCallUI(false);
    }
  };

  return (
    <div className="flex">
      <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={endCall}>
        <Phone className="rotate-[135deg]" />
        End Call
      </Button>
    </div>
  );
}
