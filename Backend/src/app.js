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

const productionClientOrigin = "https://mistry-message-frontend.onrender.com";
const developmentOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];
const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    let url;
    try {
      url = new URL(origin);
    } catch {
      throw new Error(`Invalid CLIENT_URL origin: ${origin}`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`CLIENT_URL must use HTTP or HTTPS: ${origin}`);
    }

    return url.origin;
  });
const allowedOrigins = new Set([
  productionClientOrigin,
  ...developmentOrigins,
  ...configuredOrigins,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cors({origin: "https://mistry-message-frontend.onrender.com/"}));

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
