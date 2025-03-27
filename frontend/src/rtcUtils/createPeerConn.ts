import { Socket } from "socket.io-client";
import peerConfiguration from "./stunServers";
import { ClientToServerEvents, log_error, ServerToClientEvents } from "@/helpers";

const createPeerConnection = (
  typeOfCall: string,
  socket: Socket<ServerToClientEvents, ClientToServerEvents>,
): { peerConnection: RTCPeerConnection; remoteStream: MediaStream } | null => {
  try {
    const peerConnection = new RTCPeerConnection(peerConfiguration);
    const remoteStream = new MediaStream();

    //peerConnection listeners
    peerConnection.addEventListener("signalingstatechange", (e) => {
      console.log("Signaling Event Change!");
      console.log(e);
      console.log(peerConnection.signalingState);
    });

    peerConnection.addEventListener("icecandidate", (e) => {
      console.log("Found ice candidate");
      if (e.candidate) {
        socket.emit("sendIceCandidateToServer", {
          iceCandidate: e.candidate,
          didIOffer: typeOfCall === "offer",
        });
      }
    });

    peerConnection.addEventListener("track", (e) => {
      e.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
        console.log("This should add some video/audio to the remote feed...");
      });
    });

    return { peerConnection, remoteStream };
  } catch (error) {
    log_error(error);
    return null;
  }
};

export default createPeerConnection;
