import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./config/logger.js";
import { env } from "./config/env.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import recommendRouter from "./routes/recommend.js";
import recommendationsRouter from "./routes/recommendations.js";
import feedbackRouter from "./routes/feedback.js";
import productsRouter from "./routes/products.js";
import experimentsRouter from "./routes/experiments.js";
import eventsRouter from "./routes/events.js";
import analyticsRouter from "./routes/analytics.js";
import suggestionsRouter from "./routes/suggestions.js";
import storeRouter from "./routes/store.js";
import {
  chartDoctorRouter,
  internalChartDoctorRouter,
} from "./routes/chartDoctor.js";
import communityRouter from "./routes/community.js";
import journalsRouter from "./routes/journals.js";

const app = express();

/**
 * Determine if an origin matches the configured allowed origins.
 * Supports exact matches and wildcard host patterns (e.g. https://*.vercel.app).
 *
 * @param {string} origin
 * @param {string} [allowedOriginsStr]
 * @returns {boolean}
 */
export const isOriginAllowed = (origin, allowedOriginsStr = env.ALLOWED_ORIGINS) => {
  // Allow requests without Origin (e.g. curl, server-to-server, Postman)
  if (!origin) return true;
  if (!allowedOriginsStr || allowedOriginsStr === "*") return true;

  const patterns = allowedOriginsStr
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  for (const pattern of patterns) {
    if (pattern === "*") return true;
    if (pattern === origin) return true;

    // Support wildcard patterns (e.g. https://*.vercel.app)
    if (pattern.includes("*")) {
      const reStr =
        "^" +
        pattern
          .split("*")
          .map((part) => part.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&"))
          .join(".*") +
        "$";
      const regex = new RegExp(reStr, "i");
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
};

// Trust reverse proxy (e.g. Render, AWS, Cloudflare)
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS configuration based on ALLOWED_ORIGINS with wildcard pattern support
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin '${origin}' not allowed by CORS`));
    },
    credentials: true,
  })
);

// Body parser with 10kb JSON limit per security specifications
app.use(express.json({ limit: "10kb" }));

// HTTP Request logging with Pino
app.use(
  pinoHttp({
    logger,
  })
);

// Apply 60 requests/minute rate limit on all /api/* routes
app.use("/api", apiLimiter);

// API Routes
app.use("/api/recommend", recommendRouter);
app.use("/api/recommendations", recommendationsRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/products", productsRouter);
app.use("/api/experiments", experimentsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/suggestions", suggestionsRouter);
app.use("/api/chart-doctor", chartDoctorRouter);
app.use("/internal/chart-doctor", internalChartDoctorRouter);
app.use("/api/store", storeRouter);
app.use("/api/community", communityRouter);
app.use("/api/journals", journalsRouter);

// Health check endpoint (fast, public, does not touch the database)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
export { app };
