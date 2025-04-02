import { customAlphabet } from "nanoid";
import {
  ClientToServerEvents,
  InterServerEvents,
  JoinRoomData,
  JoinRoomResponse,
  MessageData,
  NewRoomIdResponse,
  NewUserIdResponse,
  OfferObject,
  RoomMessageData,
  RoomUpdateResponse,
  // RtcEventData,
  // RtcEventResponse,
  ServerToClientEvents,
  SocketData,
} from "./events.js";
import { Server } from "socket.io";
// import { log } from "console";

// interface RoomMember {
//   socketId: string;
// }

let roomsToSocketArr = new Map<string, string[]>(); // room -> socketId[]
let userIdToName = new Map<string, string>();
let socketIdToRoom = new Map<string, string>();
let socketIdToUserId = new Map<string, string>();

// Define a custom alphabet and length for userId and roomId
const generateUserId = customAlphabet("1234567890", 5);
const generateRoomId = customAlphabet("ABCDEFGHJKLMNOPQRSTUVWXYZ1234567890", 5);

export function getNewUserId(socketId: string) {
  const userId = generateUserId();

  // TODO: Remove entry on disconnect
  socketIdToUserId.set(socketId, userId);

  const response: NewUserIdResponse = {
    userId,
  };
  return response;
}

const roomTimeouts = new Map<string, NodeJS.Timeout>();

function scheduleRoomDeletion(roomId: string, timeout: number) {
  if (roomTimeouts.has(roomId)) return;

  const timeoutId = setTimeout(() => {
    const room = roomsToSocketArr.get(roomId);
    if (room && room.length === 0) {
      roomsToSocketArr.delete(roomId);
      roomTimeouts.delete(roomId);
      console.log(`Room ${roomId} deleted due to inactivity.`);
    }
  }, timeout);

  roomTimeouts.set(roomId, timeoutId);
}

export function getNewRoomId() {
  const roomId = generateRoomId();

  // TODO: Remove empty room after 10 mins
  roomsToSocketArr.set(roomId, []);

  const timeout = 600000; // 10 minutes
  scheduleRoomDeletion(roomId, timeout);
  const response: NewRoomIdResponse = {
    roomId,
  };
  return response;
}

export function joinRoom(socketId: string, data: JoinRoomData) {
  const userId = socketIdToUserId.get(socketId) ?? "";
  userIdToName.set(userId, data.userName);
  const room = roomsToSocketArr.get(data.roomId);
  if (!room) {
    const response: JoinRoomResponse = {
      status: "error",
      roomId: data.roomId,
      message: "Couldn't join Room, invalid Room ID",
    };
    return response;
  }
  if (room.length == 2) {
    const response: JoinRoomResponse = {
      status: "error",
      roomId: data.roomId,
      message: "Room full. Maximum capacity is 2",
    };
    return response;
  }

  room.push(socketId);
  roomsToSocketArr.set(data.roomId, room);
  socketIdToRoom.set(socketId, data.roomId);
  const response: JoinRoomResponse = {
    status: "success",
    roomId: data.roomId,
    message: "Room joined",
  };

  return response;
}

export function sendRoomStatusData(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  guestSocketId: string,
  roomId: string,
) {
  const room = roomsToSocketArr.get(roomId);
  if (!room || room.length == 0) {
    return;
  }

  let roomUpdateResponse: RoomUpdateResponse = {
    isRoomFull: false,
    otherParty: "",
    showMessage: false,
  };

  if (room.length < 2) {
    const id = room[0];
    roomUpdateResponse.showMessage = guestSocketId.length !== 0 && id !== guestSocketId;
    io.to(id).emit("roomUpdate", roomUpdateResponse);
    return;
  }

  const [id1, id2] = room;
  const isRoomFull = room.length == 2;
  roomUpdateResponse.isRoomFull = isRoomFull;
  roomUpdateResponse.otherParty = id2;
  roomUpdateResponse.showMessage = guestSocketId.length !== 0 && id1 !== guestSocketId;
  io.to(id1).emit("roomUpdate", roomUpdateResponse);
  roomUpdateResponse.otherParty = id1;
  roomUpdateResponse.showMessage = guestSocketId.length !== 0 && id2 !== guestSocketId;
  io.to(id2).emit("roomUpdate", roomUpdateResponse);
}

export function handleDisconnect(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, socketId: string) {
  const roomId = socketIdToRoom.get(socketId);
  if (!roomId) {
    return;
  }

  let room = roomsToSocketArr.get(roomId);
  if (!room) {
    return;
  }

  room = room.filter((id) => id != socketId);
  if (room.length == 0) {
    roomsToSocketArr.delete(roomId);
  } else {
    roomsToSocketArr.set(roomId, room);
  }

  socketIdToRoom.delete(socketId);
  if (roomToOfferObj.has(roomId)) {
    roomToOfferObj.delete(roomId);
  }

  sendRoomStatusData(io, socketId, roomId);
}

export function forwardMessage(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  data: MessageData,
  socketId: string,
) {
  const userId = socketIdToUserId.get(socketId) ?? "";
  const userName = userIdToName.get(userId) ?? "";
  const response: RoomMessageData = {
    eventType: data.eventType,
    message: data.message,
    userId,
    userName,
  };
  io.to(socketId).emit("roomMessage", response);
  io.to(data.otherParty).emit("roomMessage", response);
}

//NOTE:delete if works
// export function forwardRTCEvent(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, RequestData: RtcEventData) {
//   const response: RtcEventResponse = {
//     type: RequestData.type,
//     data: RequestData.data,
//   };
//   io.to(RequestData.target).emit("rtcEvent", response);
// }

// we need to store rtc Offer based on roomId
// maybe move the fn calls into methods ts file
// create a room -> rtcOffer map, schedule deletion based on room -> socketId map
const roomToOfferObj = new Map<string, OfferObject>(); // roomId to OfferObj

export function newOfferEvent(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socketId: string,
  offer: any,
  targetId: string,
) {
  const roomId = socketIdToRoom.get(socketId) ?? "";

  const offerObj: OfferObject = {
    src: socketId,
    offer: offer,
    offerIceCandidates: [],
    dest: null,
    // dest: targetId, <- TODO: try this once code works
    answer: null,
    answerIceCandidates: [],
  };

  console.log("new offer, moving to", roomId);
  roomToOfferObj.set(roomId, offerObj);

  console.log("Emmiting newOffer");
  io.to(targetId).emit("newOfferAwaiting", offerObj);
}

export function newAnswerEvent(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socketId: string,
  offerObj: any,
  ackFunction: (ice: RTCIceCandidate[]) => void,
) {
  console.log("Requested Offerer", offerObj.src);
  const srcSocketId = offerObj.src;
  const roomId = socketIdToRoom.get(socketId) ?? "";
  const room = roomsToSocketArr.get(roomId);
  if (!room || room.length < 2) {
    console.log("Unable to connect to offerer");
    return;
  }
  const offerToUpdate = roomToOfferObj.get(roomId);
  if (!offerToUpdate) {
    console.log("undefined offerToUpdate");
    return;
  }
  ackFunction(offerToUpdate.offerIceCandidates);

  offerToUpdate.answer = offerObj.answer;
  offerToUpdate.dest = socketId;
  roomToOfferObj.set(roomId, offerToUpdate);

  // send answer to source socket
  io.to(srcSocketId).emit("answerResponse", offerToUpdate);
}
export function sendIceCandidateEvent(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  socketId: string,
  iceCandidate: RTCIceCandidate,
  didIOffer: boolean,
) {
  const roomId = socketIdToRoom.get(socketId) ?? "";
  const offerToUpdate = roomToOfferObj.get(roomId);
  if (!offerToUpdate) {
    console.log("iceCandidate: undefined offerToUpdate");
    return;
  }
  if (didIOffer) {
    // send to answerer
    offerToUpdate.offerIceCandidates.push(iceCandidate);
    if (offerToUpdate.dest) {
      io.to(offerToUpdate.dest).emit("receivedIceCandidateFromServer", iceCandidate);
    }
  } else {
    // send to offerer
    offerToUpdate.answerIceCandidates.push(iceCandidate);
    io.to(offerToUpdate.src).emit("receivedIceCandidateFromServer", iceCandidate);
  }
  roomToOfferObj.set(roomId, offerToUpdate);
}

export function endCallAndCleanup(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, socketId: string) {
  const roomId = socketIdToRoom.get(socketId) ?? "";
  const room = roomsToSocketArr.get(roomId);
  if (room) {
    room.forEach((id) => {
      io.to(id).emit("callEnded");
    });
  }
}
export function sendCallAnswered(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, socketId: string) {
  const roomId = socketIdToRoom.get(socketId) ?? "";
  const room = roomsToSocketArr.get(roomId);
  if (room) {
    const destId = room.filter((id) => id != socketId)[0];
    io.to(destId).emit("callAnswered");
  }
}
