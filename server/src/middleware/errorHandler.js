/**
 * Central Error Handlers matching the FitWise Universal Error Format (docs/API_CONTRACT.md).
 *
 * {
 *   "error": {
 *     "code": "STRING_ERROR_CODE",
 *     "message": "Human-readable explanation of error"
 *   }
 * }
 */

import { logger } from "../config/logger.js";

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found Handler for unmatched routes.
 */
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
};

/**
 * Central Express Error Handling Middleware.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "An unexpected error occurred";

  // Handle Zod validation errors
  if (err.name === "ZodError" || err.issues) {
    statusCode = 400;
    code = "BAD_REQUEST";
    message = err.issues
      ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      : err.message;
  }

  // Handle body-parser JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    code = "BAD_REQUEST";
    message = "Malformed JSON payload";
  }

  // Handle body-parser 10kb limit exceeded
  if (err.type === "entity.too.large" || statusCode === 413) {
    statusCode = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Payload exceeds 10kb limit";
  }

  // Handle CORS disallowed origin
  if (err.message && err.message.includes("not allowed by CORS")) {
    statusCode = 403;
    code = "FORBIDDEN";
    message = err.message;
  }

  // Map common status codes if code is default
  if (code === "INTERNAL_ERROR" || !code) {
    if (statusCode === 400) code = "BAD_REQUEST";
    else if (statusCode === 401) code = "UNAUTHORIZED";
    else if (statusCode === 403) code = "FORBIDDEN";
    else if (statusCode === 404) code = "NOT_FOUND";
    else if (statusCode === 503) code = "SERVICE_UNAVAILABLE";
    else code = "INTERNAL_ERROR";
  }

  if (statusCode >= 500) {
    if (req.log) {
      req.log.error({ err, statusCode, code }, message);
    } else {
      logger.error({ err, statusCode, code }, message);
    }
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
};

export default { AppError, notFoundHandler, errorHandler };
