import { Server } from "socket.io";
import { readFileSync } from "fs";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./events.js";
import {
  forwardMessage,
  getNewRoomId,
  getNewUserId,
  handleDisconnect,
  joinRoom,
  newAnswerEvent,
  newOfferEvent,
  sendIceCandidateEvent,
  sendRoomStatusData,
} from "./methods.js";
import { createServer } from "https";
import express from "express";

const app = express();

const key = readFileSync("certs/cert.key");
const cert = readFileSync("certs/cert.crt");

const expressServer = createServer({ key, cert }, app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(expressServer, {
  cors: {
    // origin: "http://localhost:5173",
    origin: "*", // Allow all origins
  },
});

io.on("connection", (socket) => {
  console.log("Connection established", socket.id);

  socket.on("getUserId", () => {
    const response = getNewUserId(socket.id);
    io.to(socket.id).emit("setUserId", response);
  });

  socket.on("createRoom", () => {
    const response = getNewRoomId();
    io.to(socket.id).emit("setRoomId", response);
  });

  socket.on("joinRoom", (data) => {
    const response = joinRoom(socket.id, data);
    io.to(socket.id).emit("joinRoom", response);
    if (response.status == "success") {
      sendRoomStatusData(io, data.roomId);
    }
  });

  socket.on("requestRoomUpdate", (data) => {
    sendRoomStatusData(io, data.roomId);
  });

  socket.on("sendMessage", (data) => {
    forwardMessage(io, data, socket.id);
  });

  //NOTE:delete if works
  // socket.on("rtcEvent", (data) => {
  //   forwardRTCEvent(io, data);
  // });

  // rtc handshake
  socket.on("newOffer", ({ offer, targetId }) => {
    console.log("newOffer", offer, targetId, socket.id);

    newOfferEvent(io, socket.id, offer, targetId);
  });

  socket.on("newAnswer", (offerObj, ackFunction) => {
    console.log("newAnswer", offerObj);
    newAnswerEvent(io, socket.id, offerObj, ackFunction);
  });

  socket.on("sendIceCandidateToServer", ({ iceCandidate, didIOffer }) => {
    console.log("sendIceCandidateToServer", iceCandidate, didIOffer);
    sendIceCandidateEvent(io, socket.id, iceCandidate, didIOffer);
  });

  // handle leave room / disconnect
  socket.on("disconnecting", () => {
    handleDisconnect(io, socket.id);
  });
});

// httpServer.listen(8000);
expressServer.listen(8000, "0.0.0.0", () => {
  console.log("Server running on https://0.0.0.0:8000");
});
