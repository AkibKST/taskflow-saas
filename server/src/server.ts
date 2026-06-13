import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { prisma } from "./config/prisma";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);
initSocket(httpServer);

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running → http://localhost:${PORT}`);
    console.log(`🏥 Health check → http://localhost:${PORT}/health`);
  });
};

startServer();
