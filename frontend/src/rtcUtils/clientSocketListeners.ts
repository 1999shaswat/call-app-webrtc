import { ClientToServerEvents, ServerToClientEvents } from "@/helpers";
import { CallStatusType } from "@/RtcContext";
import { Socket } from "socket.io-client";

const clientSocketListeners = (
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
  typeOfCall: string,
  callStatus: CallStatusType,
  updateCallStatus: (cs: CallStatusType) => void,
  peerConnection: RTCPeerConnection,
) => {
  console.log("clientSocketListeners added");

  socket.on("answerResponse", (entireOfferObj) => {
    console.log(entireOfferObj);
    const copyCS = { ...callStatus };
    copyCS.answer = entireOfferObj.answer;
    copyCS.myRole = typeOfCall;
    updateCallStatus(copyCS);
  });

  socket.on("receivedIceCandidateFromServer", (iceC: RTCIceCandidate) => {
    if (iceC) {
      peerConnection.addIceCandidate(iceC).catch((err) => {
        console.log("Chrome thinks there is an error. There isn't...", err);
      });
      console.log(iceC);
      console.log("Added an iceCandidate to existing page presence");
      // setShowCallInfo(false);
    }
  });
};

export default clientSocketListeners;
