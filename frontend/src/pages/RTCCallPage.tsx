import { useEffect, useState } from "react";
import { useAppContext } from "@/Context";
import { CallInfo, HandleIncomingCall, StartCall } from "@/components/ActionButtons";
import { useRtcContext } from "@/RtcContext";
import prepForCall from "@/rtcUtils/prepForCall";
import createPeerConnection from "@/rtcUtils/createPeerConn";
import clientSocketListeners from "@/rtcUtils/clientSocketListeners";
import { InCallUI } from "./InCallUI";
import { OfferObject } from "@/helpers";

export function RTCCallPage() {
  const { socket } = useAppContext();
  const { callStatus, updateCallStatus, peerConnection, setPeerConnection, setLocalStream, remoteStream, setRemoteStream, setOfferData } =
    useRtcContext();

  const [typeOfCall, setTypeOfCall] = useState("");
  const [availableCall, setAvailableCall] = useState<OfferObject | null>(null);
  const [videoMessage, setVideoMessage] = useState("Please enable video to start!");

  const [showInCallUI, setShowInCallUI] = useState(false);

  const initCall = async (typeOfCall: string) => {
    // set localStream and GUM
    await prepForCall(callStatus, updateCallStatus, setLocalStream);
    console.log("gum access granted!");
    setTypeOfCall(typeOfCall); //offer or answer
  };

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
      console.log("useeffect typeOfCall:", typeOfCall);

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
  }, [typeOfCall, peerConnection, socket]);

  useEffect(() => {
    if (remoteStream && peerConnection) {
      // TODO: show appropriate in call UI
      setShowInCallUI(true);
    }
  }, [remoteStream, peerConnection]);

  const call = async () => {
    //call related stuff goes here
    initCall("offer");
  };

  const answer = () => {
    //answer related stuff goes here
    if (availableCall) {
      initCall("answer");
      setOfferData(availableCall);
    }
  };

  const reject = () => {
    // reject call
    setAvailableCall(null);
  };

  return (
    <div>
      <div className="flex justify-center items-center aspect-video pb-2 border-2 rounded-lg border-gray-200 hover:border-gray-300 RTCCallPage">
        {showInCallUI && <InCallUI typeOfCall={typeOfCall} setShowInCallUI={setShowInCallUI} setVideoMessage={setVideoMessage} />}
        {/* {!showInCallUI && <video className="preCallCamFeed w-full h-full bg-black scale-x-[-1] rounded-lg" ref={localVideoRef} autoPlay muted />} */}
        {!showInCallUI && (
          <div className="flex w-full h-full justify-center items-center pb-2 noVideo">
            <div className="flex-1 h-full bg-blue-50 p-4 rounded-md mt-4 text-sm text-gray-700">
              <h3 className="font-semibold text-blue-600">How to Use This Room?</h3>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Allow <b>camera & microphone</b> permissions.
                </li>
                <li>
                  Share the <b>Room Code</b> with a friend.
                </li>
                <li>
                  Click <b>Call</b> to start a video chat.
                </li>
                <li>
                  Use <b>Chat</b> for messages.
                </li>
              </ul>
            </div>
            <div></div>
          </div>
        )}
      </div>
      {!showInCallUI && (
        <div className="flex justify-between items-center pt-2">
          <div className="flex justify-center items-center gap-2">
            {/* <MicToggle isMicOn={isMicOn} /> */}
            {/* <CameraToggle isCamOn={isCamOn} /> */}
          </div>
          <div className="absolute flex gap-2 justify-center items-center left-1/2 -translate-x-1/2">
            {!availableCall && <StartCall call={call} />}
            {availableCall && <HandleIncomingCall answer={answer} reject={reject} />}
            {/* three button groups: call, answer - reject, disconnect */}
          </div>
          <div>
            <CallInfo message={videoMessage} />
          </div>
        </div>
      )}
    </div>
  );
}
