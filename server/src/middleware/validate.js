/**
 * Zod Schema Validation Middleware
 * Validates request body and/or query parameters against Zod schemas.
 * Returns 400 BAD_REQUEST in API Contract error format on failure.
 */

/**
 * Creates an Express middleware to validate request payload.
 *
 * @param {import("zod").ZodSchema|{ body?: import("zod").ZodSchema, query?: import("zod").ZodSchema, params?: import("zod").ZodSchema }} schema
 * @param {"body"|"query"|"params"} [source="body"] - Default validation target if a single Zod schema is provided
 * @returns {import("express").RequestHandler}
 */
export const validate = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      // Composite schema object: { body, query, params }
      if (
        schema &&
        typeof schema === "object" &&
        ("body" in schema || "query" in schema || "params" in schema)
      ) {
        if (schema.body) {
          req.body = await schema.body.parseAsync(req.body);
        }
        if (schema.query) {
          req.query = await schema.query.parseAsync(req.query);
        }
        if (schema.params) {
          req.params = await schema.params.parseAsync(req.params);
        }
        return next();
      }

      // Single schema targeted at source
      if (source === "query") {
        req.query = await schema.parseAsync(req.query);
      } else if (source === "params") {
        req.params = await schema.parseAsync(req.params);
      } else {
        req.body = await schema.parseAsync(req.body);
      }

      return next();
    } catch (error) {
      if (error.name === "ZodError" || error.issues) {
        return res.status(400).json({
          error: {
            code: "BAD_REQUEST",
            message: error.issues
              ? error.issues
                  .map((i) => `${i.path.join(".") || "value"}: ${i.message}`)
                  .join("; ")
              : error.message,
          },
        });
      }
      return next(error);
    }
  };
};

export default validate;
