import { Info, Phone, PhoneCall } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CallStatusType } from "@/RtcContext";
import { CameraToggle } from "./CameraToggle";
import { MicToggle } from "./MicToggle";
import { EndCall } from "./EndCall";

export function CallInfo({ message }: { message: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Info />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="">
          <p>WebSocket status: connected</p>
          <p>WebRTC status: connected</p>
          <p>Info: {message}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StartCall({ call, isRoomFull }: { call: () => Promise<void>; isRoomFull: boolean }) {
  return (
    <div className="flex">
      <Button
        className={`${isRoomFull ? "animate-shine" : ""} flex-1 bg-green-500 hover:bg-green-600 text-white `}
        onClick={call}
        disabled={!isRoomFull}
      >
        <PhoneCall />
        Call
      </Button>
    </div>
  );
}

export function HandleIncomingCall({ answer, reject }: { reject: () => void; answer: () => void }) {
  // answer, reject
  return (
    <div className="flex justify-center items-center gap-2">
      <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white animate-pulse" onClick={answer}>
        <Phone />
        Answer
      </Button>
      <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white animate-pulse" onClick={reject}>
        <Phone className="rotate-[135deg]" />
        Reject
      </Button>
    </div>
  );
}

export function InCallActionButtons({
  callStatus,
  updateCallStatus,
  localFeedEl,
  remoteFeedEl,
  localStream,
  peerConnection,
  setShowInCallUI,
  ShowRemoteFeed,
}: {
  callStatus: CallStatusType;
  updateCallStatus: (cs: CallStatusType) => void;
  localFeedEl: React.RefObject<HTMLVideoElement>;
  remoteFeedEl: React.RefObject<HTMLVideoElement>;
  localStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  setShowInCallUI: (inCallUI: boolean) => void;
  ShowRemoteFeed: boolean;
}) {
  return (
    <div className="flex justify-between items-center pt-2">
      <div className="flex justify-center items-center gap-2">
        {/* <MicToggle isMicOn={isMicOn} /> */}
        {/* <CameraToggle isCamOn={isCamOn} /> */}
        <MicToggle
          localFeedEl={localFeedEl}
          callStatus={callStatus}
          localStream={localStream}
          updateCallStatus={updateCallStatus}
          peerConnection={peerConnection}
          ShowRemoteFeed={ShowRemoteFeed}
        />
        <CameraToggle
          localFeedEl={localFeedEl}
          callStatus={callStatus}
          updateCallStatus={updateCallStatus}
          localStream={localStream}
          peerConnection={peerConnection}
          ShowRemoteFeed={ShowRemoteFeed}
        />
      </div>
      <div className="absolute flex gap-2 justify-center items-center left-1/2 -translate-x-1/2">
        <EndCall localFeedEl={localFeedEl} remoteFeedEl={remoteFeedEl} peerConnection={peerConnection} setShowInCallUI={setShowInCallUI} />
      </div>
      <div>
        <CallInfo message={""} />
      </div>
    </div>
  );
}
