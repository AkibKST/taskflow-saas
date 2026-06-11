import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(` 🚀 Server running → http://localhost:${PORT}`);
  console.log(`🏥 Health check → http://localhost:${PORT}/health`);
});
