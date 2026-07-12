import dotenv from "dotenv";
dotenv.config({ override: process.env.NODE_ENV !== "production" });

import express from "express";
import cors from "cors";
import recordingsRouter from "./routes/recordings";
import stripeRouter from "./routes/stripe";
import evalsRouter from "./routes/evals";
import { requireAuth } from "./middleware/auth";
import fs from "fs";
import path from "path";
import { isOriginAllowed } from "./config/cors";

const app = express();
const PORT = process.env.PORT || 3000;

const promptPath = path.resolve(
  process.cwd(),
  process.env.VOXA_SYSTEM_PROMPT_FILE || "voxa_prompt.txt",
);
if (!process.env.VOXA_SYSTEM_PROMPT && fs.existsSync(promptPath)) {
  process.env.VOXA_SYSTEM_PROMPT = fs.readFileSync(promptPath, "utf8").trim();
}

// uploads directory creation removed for Vercel

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin, allowedOrigins, process.env.NODE_ENV))
        return callback(null, true);
      callback(new Error("Origin is not allowed."));
    },
    allowedHeaders: ["Authorization", "Content-Type", "x-user-id"],
  }),
);

// Mount Stripe router before express.json() so webhooks can use express.raw()
app.use("/api/stripe", stripeRouter);

app.use(express.json());

app.use("/api/recordings", requireAuth, recordingsRouter);

if (process.env.NODE_ENV !== "production") {
  app.use("/api/internal/evals", requireAuth, evalsRouter);
}

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Voxa API running on port ${PORT}`);
  });
}

export default app;
