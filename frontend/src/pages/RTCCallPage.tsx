import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Camera, CameraOff, Loader2, Mic, MicOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/Context";
import {
  handleHangUpEvent,
  handleNewICECandidateEvent,
  handleVideoAnswerEvent,
  handleVideoOfferEvent,
  hangUpCall,
  micOff,
  startCall,
  micOn,
  updateSocketInstance,
  updateVariables,
  camOff,
  camOn,
} from "@/rtchelpers";
import { log_error } from "@/helpers";

export function RTCCallPage() {
  const [callStatus, setCallStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { socket, otherParty } = useAppContext();

  const [isCamOn, setIsCamOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);

  const micToggle = () => {
    setIsMicOn((v) => !v);
    if (isMicOn) {
      micOff();
    } else {
      micOn();
    }
  };

  const camToggle = () => {
    setIsCamOn((v) => !v);
    if (isCamOn) {
      camOff();
    } else {
      camOn();
    }
  };

  useEffect(() => {
    if (socket && socket.connected) {
      updateSocketInstance(socket);
      socket.on("rtcEvent", (response) => {
        console.log("RTCEVENT");
        console.log(response);

        const type = response.type;
        const data = JSON.parse(response.data);
        switch (type) {
          case "video-offer":
            handleVideoOfferEvent(data);
            break;
          case "video-answer":
            handleVideoAnswerEvent(data);
            break;
          case "new-ice-candidate":
            handleNewICECandidateEvent(data);
            break;
          case "hang-up":
            handleHangUpEvent();
            break;

          default:
            log_error("Unknown Event");
            log_error(data);
            break;
        }
      });
      // socket.emit("requestRoomUpdate", req);
    }
    return () => {
      if (socket) {
        socket.offAny();
      }
    };
  }, [socket]);

  useEffect(() => {
    updateVariables(otherParty, localVideoRef, remoteVideoRef, setCallStatus);
    if (isMicOn) {
      micOff();
    } else {
      micOn();
    }

    if (isCamOn) {
      camOff();
    } else {
      camOn();
    }

    // attachWebcamStream();
    // return () => {
    //   closeWebcamTrack();
    // };
  }, [otherParty, localVideoRef, remoteVideoRef, setCallStatus]);

  return (
    <div>
      <div className="flex justify-center items-center aspect-video pb-2">
        <video className="w-full h-full bg-black scale-x-[-1] rounded-lg" ref={localVideoRef} autoPlay muted></video>
        <video className="w-full h-full bg-black scale-x-[-1] rounded-lg" ref={remoteVideoRef} autoPlay></video>
      </div>
      <div className="flex justify-center items-center gap-2">
        <Button variant={isCamOn ? "default" : "secondary"} size="icon" onClick={camToggle}>
          {isCamOn ? <Camera className="h-6 w-6" /> : <CameraOff className="h-6 w-6" />}
          <span className="sr-only">{isCamOn ? "Turn camera off" : "Turn camera on"}</span>
        </Button>

        <Button variant={isMicOn ? "default" : "secondary"} size="icon" onClick={micToggle}>
          {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          <span className="sr-only">{isMicOn ? "Mute microphone" : "Unmute microphone"}</span>
        </Button>
        {callStatus == "disconnected" && (
          <div className="flex">
            <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => startCall()}>
              <Phone />
              Call
            </Button>
          </div>
        )}
        {callStatus == "connecting" && (
          <div className="flex">
            <Button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white" disabled>
              <Loader2 className="animate-spin" />
              Connecting
            </Button>
          </div>
        )}
        {callStatus == "connected" && (
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onDoubleClick={() => hangUpCall()}>
                    <Phone className="rotate-[135deg]" />
                    End Call
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Double click to End Call</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}
