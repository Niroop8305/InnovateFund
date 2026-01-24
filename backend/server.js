import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "./config/database.js";
import "./config/firebase.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import ideaRoutes from "./routes/ideas.js";
import investorRoutes from "./routes/investors.js";
import chatRoutes from "./routes/chat.js";
import notificationRoutes from "./routes/notifications.js";
import aiRoutes from "./routes/ai.js";

import { authMiddleware } from "./middleware/auth.js";
import { setupSocketHandlers } from "./controllers/socketController.js";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_STORAGE_BUCKET",
  "OPENROUTER_API_KEY",
  "OPENROUTER_API_URL",
];

const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName],
);
if (missingEnvVars.length > 0) {
  console.error(
    "Missing required environment variables:",
    missingEnvVars.join(", "),
  );
  console.error("Please check your .env file.");
  process.exit(1);
}

const app = express();
const server = createServer(app);

// Configure allowed origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://innovate-fund.vercel.app",
  /\.vercel\.app$/, // Allow all Vercel preview deployments
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const isAllowed = allowedOrigins.some((allowed) =>
        typeof allowed === "string" ? allowed === origin : allowed.test(origin)
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();
) {
        callback(null, true);
        return;
      }
      const isAllowed = allowedOrigins.some((allowed) =>
        typeof allowed === "string" ? allowed === origin : allowed.test(origin)
      );
      if (isAllowed
// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/ideas", authMiddleware, ideaRoutes);
app.use("/api/investors", authMiddleware, investorRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/notifications", authMiddleware, notificationRoutes);
app.use("/api/ai", authMiddleware, aiRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Socket.IO setup
setupSocketHandlers(io);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? error.message : {},
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

export { io };
