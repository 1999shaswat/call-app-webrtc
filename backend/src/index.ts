import { createServer } from "http";
import { Server } from "socket.io";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "./events.js";
import { forwardMessage, forwardRTCEvent, getNewRoomId, getNewUserId, handleDisconnect, joinRoom, sendRoomStatusData } from "./methods.js";

const httpServer = createServer();
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
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

  socket.on("rtcEvent", (data) => {
    forwardRTCEvent(io, data);
  });

  // rtc handshake
  // handle leave room / disconnect
  socket.on("disconnecting", () => {
    handleDisconnect(io, socket.id);
  });
});

// httpServer.listen(8000);
httpServer.listen(8000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:8000");
});
