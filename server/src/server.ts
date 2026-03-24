import http from "http";
import { Server } from "socket.io";
import app from "./app";
import "dotenv/config";

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// HTTP server
const httpServer = http.createServer(app);

// Socket.io — attach to same HTTP server
export const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true, methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

// Basic socket connection
io.on("connection", (socket) => {
  console.log(` Socket connected: ${socket.id}`);
  socket.on("disconnect", () =>
    console.log(`  Socket disconnected: ${socket.id}`),
  );
});

httpServer.listen(PORT, () => {
  console.log(` 🚀 Server running → http://localhost:${PORT}`);
  console.log(`🏥 Health check → http://localhost:${PORT}/health`);
});
