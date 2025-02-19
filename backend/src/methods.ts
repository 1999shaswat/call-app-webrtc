import { customAlphabet } from "nanoid";
import {
  ClientToServerEvents,
  InterServerEvents,
  JoinRoomData,
  JoinRoomResponse,
  MessageData,
  NewRoomIdResponse,
  NewUserIdResponse,
  RoomMessageData,
  RoomUpdateResponse,
  RtcEventData,
  RtcEventResponse,
  ServerToClientEvents,
  SocketData,
} from "./events.js";
import { Server } from "socket.io";

// interface RoomMember {
//   socketId: string;
// }

let rooms = new Map<string, string[]>();
let userIdToName = new Map<string, string>();
let socketIdToRoom = new Map<string, string>();
let socketIdToUserId = new Map<string, string>();

// Define a custom alphabet and length for userId and roomId
const generateUserId = customAlphabet("1234567890", 5);
const generateRoomId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 5);

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
    const room = rooms.get(roomId);
    if (room && room.length === 0) {
      rooms.delete(roomId);
      roomTimeouts.delete(roomId);
      console.log(`Room ${roomId} deleted due to inactivity.`);
    }
  }, timeout);

  roomTimeouts.set(roomId, timeoutId);
}
export function getNewRoomId() {
  const roomId = generateRoomId();

  // TODO: Remove empty room after 10 mins
  rooms.set(roomId, []);

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
  const room = rooms.get(data.roomId);
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
  rooms.set(data.roomId, room);
  socketIdToRoom.set(socketId, data.roomId);
  const response: JoinRoomResponse = {
    status: "success",
    roomId: data.roomId,
    message: "Room joined",
  };

  return response;
}

export function sendRoomStatusData(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.length == 0) {
    return;
  }

  let roomUpdateResponse: RoomUpdateResponse = {
    isRoomFull: false,
    otherParty: "",
  };

  if (room.length < 2) {
    const id = room[0];
    io.to(id).emit("roomUpdate", roomUpdateResponse);
  }

  const [id1, id2] = room;
  const isRoomFull = room.length == 2;
  roomUpdateResponse.isRoomFull = isRoomFull;
  roomUpdateResponse.otherParty = id2;
  io.to(id1).emit("roomUpdate", roomUpdateResponse);
  roomUpdateResponse.otherParty = id1;
  io.to(id2).emit("roomUpdate", roomUpdateResponse);
}

export function handleDisconnect(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, socketId: string) {
  const roomId = socketIdToRoom.get(socketId);
  if (!roomId) {
    return;
  }

  let room = rooms.get(roomId);
  if (!room) {
    return;
  }

  room = room.filter((id) => id != socketId);
  if (room.length == 0) {
    rooms.delete(roomId);
  } else {
    rooms.set(roomId, room);
  }

  socketIdToRoom.delete(socketId);
  sendRoomStatusData(io, roomId);
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
export function forwardRTCEvent(io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, RequestData: RtcEventData) {
  const response: RtcEventResponse = {
    type: RequestData.type,
    data: RequestData.data,
  };
  io.to(RequestData.target).emit("rtcEvent", response);
}
