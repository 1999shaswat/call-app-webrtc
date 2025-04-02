import { useEffect, useRef, useState } from "react";
import { useAppContext } from "@/Context";
import { CallInfo, HandleIncomingCall, InCallActionButtons, StartCall } from "@/components/ActionButtons";
import { useRtcContext } from "@/RtcContext";
import prepForCall from "@/rtcUtils/prepForCall";
import createPeerConnection from "@/rtcUtils/createPeerConn";
import clientSocketListeners from "@/rtcUtils/clientSocketListeners";
import { InCallUI } from "./InCallUI";
import { OfferObject } from "@/helpers";
import { toast } from "sonner";

export function RTCCallPage({ isRoomFull }: { isRoomFull: boolean }) {
  const remoteFeedEl = useRef<HTMLVideoElement>(null);
  const localFeedEl = useRef<HTMLVideoElement>(null);
  const [ShowRemoteFeed, setShowRemoteFeed] = useState(false);

  const { socket } = useAppContext();
  const {
    callStatus,
    updateCallStatus,
    peerConnection,
    setPeerConnection,
    localStream,
    setLocalStream,
    remoteStream,
    setRemoteStream,
    setOfferData,
  } = useRtcContext();

  const [typeOfCall, setTypeOfCall] = useState("");
  const [availableCall, setAvailableCall] = useState<OfferObject | null>(null);
  const [videoMessage, setVideoMessage] = useState("Working as expected");

  const [showInCallUI, setShowInCallUI] = useState(false);

  const initCall = async (typeOfCall: string) => {
    // set localStream and GUM
    await prepForCall(callStatus, updateCallStatus, setLocalStream);
    console.log("gum access granted!");
    setTypeOfCall(typeOfCall); //offer or answer
  };

  useEffect(() => {
    setShowRemoteFeed(typeOfCall === "answer");
  }, [typeOfCall]);

  useEffect(() => {
    if (socket && socket.connected) {
      socket.on("callAnswered", () => {
        setShowRemoteFeed(true);
      });
    }

    return () => {
      if (socket) {
        socket.off("callAnswered");
      }
    };
  }, [socket]);

  useEffect(() => {
    if (socket && socket.connected) {
      // add call request to array
      const setCall = (data: OfferObject) => {
        setAvailableCall(data);
        console.log(data);
      };
      socket.on("newOfferAwaiting", setCall);
    }
    return () => {
      if (socket) {
        socket.off("newOfferAwaiting");
      }
    };
  }, [socket]);

  //We have media via GUM. setup the peerConnection w/listeners
  useEffect(() => {
    if (socket && socket.connected) {
      if (callStatus.haveMedia && !peerConnection) {
        // prepForCall has finished running and updated callStatus
        const conn = createPeerConnection(typeOfCall, socket);
        if (conn) {
          setPeerConnection(conn.peerConnection);
          setRemoteStream(conn.remoteStream);
        } else {
          console.error("Failed to create peer connection");
        }
      }
    }
  }, [callStatus.haveMedia, socket]); //TODO: do we need socket here?

  useEffect(() => {
    if (socket && socket.connected) {
      // console.log("useeffect typeOfCall:", typeOfCall);

      if (typeOfCall && peerConnection) {
        clientSocketListeners(socket, typeOfCall, callStatus, updateCallStatus, peerConnection);
      }
    }
    return () => {
      if (socket) {
        socket.off("receivedIceCandidateFromServer");
        socket.off("answerResponse");
      }
    };
  }, [typeOfCall, peerConnection, callStatus, socket]);

  useEffect(() => {
    const endCallAndCleanup = () => {
      console.log("Call ended RTCCallPage");
      setPeerConnection(null); // reset peerConnection
      localStream?.getTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
      setRemoteStream(null);
      setOfferData(null);
      updateCallStatus({});
      setTypeOfCall("");
      setAvailableCall(null);
      setShowInCallUI(false);

      toast.info("Call Ended");
    };

    if (socket && socket.connected) {
      socket.on("callEnded", () => {
        endCallAndCleanup();
      });
    }
    return () => {
      if (socket) {
        socket.off("callEnded");
      }
    };
  }, [socket, localStream]);

  const call = async () => {
    //call related stuff goes here
    initCall("offer");
  };

  useEffect(() => {
    if (remoteStream && peerConnection) {
      // TODO: show appropriate in call UI
      setShowInCallUI(true);
    }
  }, [remoteStream, peerConnection]);

  const answer = () => {
    //answer related stuff goes here
    if (availableCall) {
      initCall("answer");
      setOfferData(availableCall);
      if (socket && socket.connected) {
        socket.emit("callAnswered");
      }
    }
  };

  const reject = () => {
    // reject call
    if (peerConnection) {
      peerConnection.close();
      peerConnection.onicecandidate = null;
      peerConnection.ontrack = null;
    }
    if (socket && socket.connected) {
      console.log("callEnded emmitted");
      socket.emit("callEnded");
    }
    setShowInCallUI(false);
    setAvailableCall(null);
  };

  return (
    <>
      <div className="flex justify-center items-center aspect-video rounded-lg border border-[#E4E7EB] bg-[#FDFCFB] RTCCallPage">
        {showInCallUI && (
          <InCallUI
            typeOfCall={typeOfCall}
            setVideoMessage={setVideoMessage}
            remoteFeedEl={remoteFeedEl}
            localFeedEl={localFeedEl}
            ShowRemoteFeed={ShowRemoteFeed}
          />
        )}
        {/* {!showInCallUI && <video className="preCallCamFeed w-full h-full bg-black scale-x-[-1] rounded-lg" ref={localVideoRef} autoPlay muted />} */}
        {!showInCallUI && (
          <div className="flex max-w-md items-center text-[#9AA5B1] text-center italic">
            {!isRoomFull
              ? "Just you for now 😎 Waiting for your partner to join! 🌟"
              : "Ready to roll 🚀 Allow camera & mic, then start your call when ready. Use Chat for messages!"}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center pt-2">
        {!showInCallUI && (
          <div className="absolute flex gap-2 justify-center items-center left-1/2 -translate-x-1/2">
            {!availableCall && <StartCall call={call} isRoomFull={isRoomFull} />}
            {availableCall && <HandleIncomingCall answer={answer} reject={reject} />}
          </div>
        )}
        {showInCallUI && (
          <InCallActionButtons
            callStatus={callStatus}
            updateCallStatus={updateCallStatus}
            localFeedEl={localFeedEl}
            remoteFeedEl={remoteFeedEl}
            localStream={localStream}
            peerConnection={peerConnection}
            setShowInCallUI={setShowInCallUI}
            ShowRemoteFeed={ShowRemoteFeed}
          />
        )}
        <div>
          <CallInfo message={videoMessage} />
        </div>
      </div>
    </>
  );
}
