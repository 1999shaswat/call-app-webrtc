import { CallStatusType } from "@/RtcContext";
import { Button } from "./ui/button";
import { Camera, CameraOff } from "lucide-react";

export function CameraToggle({
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
  const startStopVideo = () => {
    if (!localStream || !peerConnection) {
      return;
    }
    const copyCallStatus = { ...callStatus };
    // useCases:
    if (copyCallStatus.videoEnabled) {
      // 1. Video is enabled, so we need to disable
      copyCallStatus.videoEnabled = false;
      updateCallStatus(copyCallStatus);
      const tracks = localStream.getVideoTracks();
      tracks.forEach((track) => (track.enabled = false));
    } else if (copyCallStatus.videoEnabled === false) {
      // 2. Video is disabled, so we need to enable
      copyCallStatus.videoEnabled = true;
      updateCallStatus(copyCallStatus);
      const tracks = localStream.getVideoTracks();
      tracks.forEach((track) => (track.enabled = true));
    } else if (copyCallStatus.videoEnabled === null) {
      // 3. Video is null, so we need to init
      console.log("Init video!");
      copyCallStatus.videoEnabled = true;
      updateCallStatus(copyCallStatus);

      const tracks = localStream.getVideoTracks();
      tracks.forEach((track) => (track.enabled = true));
      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
    }
  };

  return (
    <Button variant={callStatus.videoEnabled ? "default" : "secondary"} size="icon" onClick={startStopVideo} disabled={!ShowRemoteFeed}>
      {callStatus.videoEnabled === true ? (
        <Camera className="h-6 w-6" />
      ) : callStatus.videoEnabled === false ? (
        <CameraOff className="h-6 w-6" />
      ) : (
        <Camera className="h-6 w-6 animate-pulse" />
      )}
    </Button>
  );
}
