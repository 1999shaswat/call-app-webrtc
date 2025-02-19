import { Socket } from "socket.io-client";
import { ClientToServerEvents, log, log_error, RtcEventData, ServerToClientEvents } from "./helpers";

let socketInstance: Socket<ServerToClientEvents, ClientToServerEvents>;
let target: string;
let localVideo: React.RefObject<HTMLVideoElement>, remoteVideo: React.RefObject<HTMLVideoElement>;
let webcamStream: MediaStream | null = null;
let setCallStatusFn: (callStatus: "disconnected" | "connected" | "connecting") => void;

export function updateSocketInstance(socket: Socket<ServerToClientEvents, ClientToServerEvents>) {
  socketInstance = socket;
}

export function updateVariables(
  targetSocketId: string,
  localVideoRef: React.RefObject<HTMLVideoElement>,
  remoteVideoRref: React.RefObject<HTMLVideoElement>,
  setCallStatus: (callStatus: "disconnected" | "connected" | "connecting") => void,
) {
  target = targetSocketId;
  localVideo = localVideoRef;
  remoteVideo = remoteVideoRref;
  setCallStatusFn = setCallStatus;
}

function sendToServer(event: RtcEventData) {
  if (!(socketInstance && socketInstance.connected)) {
    log_error("Socket Not Connected");
    return;
  }
  console.log("send to server");

  console.log(event);
  socketInstance.emit("rtcEvent", event);
}

export const mediaConstraints = {
  audio: true,
  video: {
    aspectRatio: {
      ideal: 1.333333,
    },
  },
};

export let peerConnection: RTCPeerConnection | null;

async function createPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      /*{
        urls: "relay1.expressturn.com:3478",
        username: "",
        credential: "",
      }*/
    ],
  });
  await attachWebcamStream();

  peerConnection.onicecandidate = onIceCandidateFn;
  peerConnection.onconnectionstatechange = onConnectionStateChangeFn;
  peerConnection.oniceconnectionstatechange = onIceConnectionStateChangeFn;
  peerConnection.onicegatheringstatechange = onIceGatheringStateChangeFn;
  peerConnection.onsignalingstatechange = onSignalingStateChangeFn;
  peerConnection.onnegotiationneeded = onNegotiationNeededFn;
  peerConnection.ontrack = onTrackFn;
}

function onIceCandidateFn(event: RTCPeerConnectionIceEvent) {
  if (event.candidate) {
    log("Outgoing ICE candidate: " + event.candidate.candidate);
    sendToServer({
      type: "new-ice-candidate",
      target: target,
      data: JSON.stringify(event.candidate),
    });
  }
}

function onConnectionStateChangeFn() {
  if (!peerConnection) {
    return;
  }
  log("Connection state changed");
  switch (peerConnection.connectionState) {
    case "new":
    case "connecting":
      console.log(" Connecting...");
      setCallStatusFn("connecting");
      break;

    case "connected":
      console.log(" Connected! Call is active.");
      setCallStatusFn("connected");
      break;

    case "disconnected":
      console.log("⚠️Disconnected! Trying to reconnect...");
      setCallStatusFn("disconnected");
      break;

    case "failed":
      console.log(" Connection failed! Call might have dropped.");
      setCallStatusFn("disconnected");
      break;

    case "closed":
      console.log(" Call ended.");
      setCallStatusFn("disconnected");
      break;

    default:
      break;
  }
}

function onIceConnectionStateChangeFn() {
  if (!peerConnection) {
    return;
  }

  log("*** ICE connection state changed to " + peerConnection.iceConnectionState);

  switch (peerConnection.iceConnectionState) {
    case "closed":
    case "failed":
    case "disconnected":
      closeVideoCall();
      break;
  }
}

function onIceGatheringStateChangeFn() {
  if (!peerConnection) {
    return;
  }

  log("*** ICE gathering state changed to: " + peerConnection.iceGatheringState);
}

function onSignalingStateChangeFn() {
  if (!peerConnection) {
    return;
  }

  log("*** WebRTC signaling state changed to: " + peerConnection.signalingState);
  switch (peerConnection.signalingState) {
    case "closed":
      closeVideoCall();
      break;
  }
}

async function onNegotiationNeededFn() {
  if (!peerConnection) {
    return;
  }

  log("*** Negotiation needed");
  try {
    log("Creating offer");
    const offer = await peerConnection.createOffer();
    if (peerConnection.signalingState != "stable") {
      log("Connection not stable yet. Postponing");
      return;
    }
    log("setting local desc to offer");
    await peerConnection.setLocalDescription(offer);
    log("sending offer to remote peer");
    sendToServer({
      type: "video-offer",
      target: target,
      data: JSON.stringify(peerConnection.localDescription),
    });
  } catch (error) {
    log("***Error occured while onnegotiationneeded");
    log_error(error);
  }
}

function onTrackFn(event: RTCTrackEvent) {
  log("*** Track event received");

  if (!remoteVideo.current) {
    log_error("Remote video element is not set!");
    return;
  }

  let remoteStream = remoteVideo.current.srcObject as MediaStream;

  if (!remoteStream) {
    log("Creating new MediaStream for remote video");
    remoteStream = new MediaStream();
    remoteVideo.current.srcObject = remoteStream;
  }

  event.streams[0]?.getTracks().forEach((track) => {
    log(`Adding track: ${track.kind}`);
    remoteStream.addTrack(track);
  });
}

export async function attachWebcamStream() {
  // If a stream exists, check if at least one track is still active.
  if (!webcamStream) {
    try {
      webcamStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    } catch (err) {
      if (err instanceof Error) {
        handleGetUserMediaError(err);
      } else {
        log_error(err);
      }
      return;
    }
  }

  if (localVideo.current) {
    localVideo.current.srcObject = webcamStream;
  }
}

export async function handleVideoOfferEvent(data: RTCSessionDescriptionInit) {
  /*
   * initialize peerObj
   * set remote SDP
   * add track to html
   * send answer
   */
  log("Received video chat offer");
  if (!peerConnection) {
    await createPeerConnection();
  }
  if (!peerConnection) {
    log_error("Failed to create PeerConnection");
    return;
  }

  var desc = new RTCSessionDescription(data);
  if (peerConnection.signalingState !== "stable") {
    log("Signaling state isn't stable, rolling back...");
    await Promise.all([peerConnection.setLocalDescription({ type: "rollback" }), peerConnection.setRemoteDescription(desc)]);
    return;
  }

  log("Setting remote description");
  await peerConnection.setRemoteDescription(desc);

  await attachWebcamStream();
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => {
      peerConnection?.addTrack(track, webcamStream as MediaStream);
    });
  }

  log("Creating and sending answer to caller");
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  sendToServer({
    type: "video-answer",
    target: target,
    data: JSON.stringify(peerConnection.localDescription),
  });
}

export async function handleVideoAnswerEvent(data: RTCSessionDescriptionInit) {
  if (!peerConnection) {
    return;
  }
  log("*** Call recipient has accepted our call");
  // Configure the remote description, which is the SDP payload
  // in our "video-answer" message.

  let desc = new RTCSessionDescription(data);
  await peerConnection.setRemoteDescription(desc).catch(log_error);
}

export async function handleNewICECandidateEvent(data: RTCIceCandidateInit) {
  if (!peerConnection) {
    log_error("No peerConnection found for ICE candidate, ignoring...");
    return;
  }

  let candidate = new RTCIceCandidate(data);

  log("*** Adding received ICE candidate: " + JSON.stringify(candidate));
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (err) {
    log_error(err);
  }
}

export async function startCall() {
  log("Starting to prepare an invitation");
  if (peerConnection) {
    alert("You can't start a call because you already have one open!");
    return;
  }

  await createPeerConnection();
  await attachWebcamStream();
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => {
      peerConnection?.addTrack(track, webcamStream as MediaStream);
    });
  }

  log("Creating WebRTC offer...");
  const offer = await peerConnection!.createOffer();
  await peerConnection!.setLocalDescription(offer);

  // 5. Send the offer via your signaling server
  sendToServer({
    type: "video-offer",
    target: target,
    data: JSON.stringify(peerConnection!.localDescription),
  });

  log("Offer sent to remote peer");
}

export function handleHangUpEvent() {
  log("*** Received hang up notification from other peer");
  closeVideoCall();
}

export function hangUpCall() {
  closeVideoCall();

  sendToServer({
    type: "hang-up",
    target: target,
    data: "",
  });
}

export function closeVideoCall() {
  log("Closing call");
  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.oniceconnectionstatechange = null;
    peerConnection.onicegatheringstatechange = null;
    peerConnection.onsignalingstatechange = null;
    peerConnection.onnegotiationneeded = null;
    peerConnection.ontrack = null;

    peerConnection.getTransceivers().forEach((transceiver) => transceiver.stop());
    peerConnection.close();
    peerConnection = null;
  }
  setCallStatusFn("disconnected");
}

function handleGetUserMediaError(e: Error) {
  log_error(e);
  switch (e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone" + "were found.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // Do nothing; this is the same as the user canceling the call.
      break;
    default:
      alert("Error opening your camera and/or microphone: " + e.message);
      break;
  }

  // Make sure we shut down our end of the RTCPeerConnection so we're
  // ready to try again.

  closeVideoCall();
}

export async function micOff() {}
export async function micOn() {}

export async function camOff() {}
export async function camOn() {}
