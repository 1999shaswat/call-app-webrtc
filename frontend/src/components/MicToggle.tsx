import { Mic, MicOff } from "lucide-react";
import { Button } from "./ui/button";
import { CallStatusType } from "@/RtcContext";

export function MicToggle({
  localFeedEl,
  callStatus,
  localStream,
  updateCallStatus,
  peerConnection,
  ShowRemoteFeed,
}: {
  localFeedEl: React.RefObject<HTMLVideoElement>;
  callStatus: CallStatusType;
  localStream: MediaStream | null;
  updateCallStatus: (cs: CallStatusType) => void;
  peerConnection: RTCPeerConnection | null;
  ShowRemoteFeed: boolean;
}) {
  const startStopAudio = () => {
    if (!localStream || !peerConnection) {
      return;
    }
    const copyCallStatus = { ...callStatus };
    //first, check if the audio is enabled, if so disabled
    if (copyCallStatus.audioEnabled === true) {
      copyCallStatus.audioEnabled = false;
      updateCallStatus(copyCallStatus);
      //set the stream to disabled
      const tracks = localStream.getAudioTracks();
      tracks.forEach((t) => (t.enabled = false));
    } else if (callStatus.audioEnabled === false) {
      //second, check if the audio is disabled, if so enable
      copyCallStatus.audioEnabled = true;
      updateCallStatus(copyCallStatus);
      //set the stream to disabled
      const tracks = localStream.getAudioTracks();
      tracks.forEach((t) => (t.enabled = true));
    } else if (copyCallStatus.audioEnabled === null) {
      console.log("Init audio!");
      copyCallStatus.audioEnabled = true;
      updateCallStatus(copyCallStatus);

      //add the tracks
      localStream.getAudioTracks().forEach((t) => {
        peerConnection.addTrack(t, localStream);
      });
    }
  };
  return (
    <Button variant={callStatus.audioEnabled ? "default" : "secondary"} size="icon" onClick={startStopAudio} disabled={!ShowRemoteFeed}>
      {callStatus.audioEnabled === true ? (
        <Mic className="h-6 w-6" />
      ) : callStatus.audioEnabled === false ? (
        <MicOff className="h-6 w-6" />
      ) : (
        <Mic className="h-6 w-6 animate-pulse" />
      )}
    </Button>
  );
}
