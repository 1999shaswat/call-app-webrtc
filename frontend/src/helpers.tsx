import { toast } from "sonner";

export const copyToClipboard = async (textToCopy: string) => {
  try {
    await navigator.clipboard.writeText(textToCopy); // Copy text to clipboard
    toast.success("Code Copied");
  } catch (err) {
    toast.success("Failed to copy");
  }
};

export function log(text: string) {
  var time = new Date();
  console.log("[" + time.toLocaleTimeString() + "] " + text);
}

export function log_error(err: any) {
  if (err instanceof Error) {
    const text = `Error ${err.name}: ${err.message}`;
    var time = new Date();
    console.trace("[" + time.toLocaleTimeString() + "] " + text);
  } else {
    console.error("Unexpected error", err);
  }
}

// ~~ INTERFACES ~~

// server to client

// RTC

// NOTE:delete if works
// export interface RtcEventResponse {
//   type: "video-offer" | "video-answer" | "new-ice-candidate" | "hang-up";
//   data: string;
// }

export interface NewUserIdResponse {
  userId: string;
}

export interface NewRoomIdResponse {
  roomId: string;
}

export interface JoinRoomResponse {
  status: "success" | "error";
  roomId: string;
  message: string;
}

export interface RoomUpdateResponse {
  isRoomFull: boolean;
  otherParty: string;
  showMessage: boolean;
}

export interface RoomMessageData {
  eventType: "user";
  message: string;
  userId: string;
  userName: string;
}

export interface ServerToClientEvents {
  setUserId: (response: NewUserIdResponse) => void;
  setRoomId: (response: NewRoomIdResponse) => void;
  joinRoom: (response: JoinRoomResponse) => void;
  roomUpdate: (response: RoomUpdateResponse) => void;
  roomMessage: (response: RoomMessageData) => void;
  // rtcEvent: (response: RtcEventResponse) => void; //NOTE:delete if works
  newOfferAwaiting: (offerObj: OfferObject) => void;
  answerResponse: (offerToUpdate: OfferObject) => void;
  receivedIceCandidateFromServer: (iceCandidate: RTCIceCandidate) => void;
  callEnded: () => void;
  callAnswered: () => void;
}

// RTC
export interface OfferObject {
  src: string;
  offer: RTCSessionDescriptionInit;
  offerIceCandidates: RTCIceCandidate[];
  dest: string | null;
  answer: RTCSessionDescriptionInit | null;
  answerIceCandidates: RTCIceCandidate[];
}

//NOTE:delete if works
// export interface RtcEventData {
//   type: "video-offer" | "video-answer" | "new-ice-candidate" | "hang-up";
//   target: string;
//   data: string;
// }

interface JoinRoomData {
  userName: string;
  roomId: string;
}

export interface MessageData {
  eventType: "user";
  message: string;
  otherParty: string;
}

export interface RequestUpdateData {
  roomId: string;
}

export interface ClientToServerEvents {
  getUserId: () => void;
  createRoom: () => void;
  joinRoom: (data: JoinRoomData) => void;
  sendMessage: (data: MessageData) => void;
  requestRoomUpdate: (data: RequestUpdateData) => void;
  // rtcEvent: (data: RtcEventData) => void; -> NOTE:delete if works
  newOffer: ({ offer, targetId }: { offer: RTCSessionDescriptionInit; targetId: string }) => void;
  newAnswer: (offerObj: OfferObject, ackFunction: (response: any) => void) => void;
  sendIceCandidateToServer: ({ iceCandidate, didIOffer }: { iceCandidate: RTCIceCandidate; didIOffer: boolean }) => void;
  callEnded: () => void;
  callAnswered: () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  name: string;
  age: number;
}
