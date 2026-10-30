import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import helmet from "helmet";

// DB table initialisation
import { createUsersTable, seedDefaultAdmin } from "./models/user.model.js";
import { createMessagesTable } from "./models/message.model.js";
import { createRefreshTokensTable } from "./models/token.model.js";
import { createSettingsTable } from "./models/settings.model.js";

// Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import meRoutes from "./routes/me.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import messageRoutes from "./routes/message.routes.js";

// Global error handler
import errorHandler from "./middlewares/error.js";
import { apiLimiter } from "./middlewares/rateLimit.js";

// Initialize the database before serving requests.
await createUsersTable();
await createMessagesTable();
await createRefreshTokensTable();
await createSettingsTable();
await seedDefaultAdmin();
console.log("Database tables verified & initialized successfully.");

const app = express();

app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid CORS friction
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(apiLimiter);

// Routes 
app.use("/api/messages", messageRoutes); 
app.use("/api/auth", authRoutes);       
app.use("/api/admin", adminRoutes);     
app.use("/api/users", userRoutes);      
app.use("/api/me", meRoutes);           

app.use(errorHandler);

export default app;
