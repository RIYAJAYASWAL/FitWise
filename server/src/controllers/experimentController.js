/**
 * Experiment Controller
 * Handles GET /api/experiments/assign per FitWise API Contract §4.5.
 */

import { assign, clearExperimentCache } from "../services/experimentService.js";
import { experimentResults } from "../services/analyticsService.js";
import { Experiment } from "../models/Experiment.js";

const TYPE_NAMES = {
  widget_toggle: "Widget on/off",
  widget_design: "Widget design",
  widget_placement: "Widget placement",
};

/**
 * Handle GET /api/experiments
 * Query params: status (all|running|paused|completed), q (search text)
 */
export const listExperiments = async (req, res, next) => {
  try {
    const storeId = req.store?.storeId;
    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const { status, q } = req.query;

    // Fetch all experiments for counts
    const allExperiments = await Experiment.find({ storeId })
      .sort({ startedAt: -1, createdAt: -1 })
      .lean();

    const counts = {
      all: allExperiments.length,
      running: allExperiments.filter((e) => e.status === "running").length,
      completed: allExperiments.filter((e) => e.status === "completed").length,
      paused: allExperiments.filter((e) => e.status === "paused").length,
    };

    // Filter by status if specified and not 'all'
    let filtered = allExperiments;
    if (status && status !== "all") {
      filtered = filtered.filter((e) => e.status === status);
    }

    // Filter by search query if provided
    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim().toLowerCase();
      filtered = filtered.filter((e) => {
        const nameMatch = (e.name || "").toLowerCase().includes(term);
        const descMatch = (e.description || "").toLowerCase().includes(term);
        const goalMatch = (e.goal || "").toLowerCase().includes(term);
        const variantAMatch = (e.variants?.a?.label || "").toLowerCase().includes(term);
        const variantBMatch = (e.variants?.b?.label || "").toLowerCase().includes(term);
        return nameMatch || descMatch || goalMatch || variantAMatch || variantBMatch;
      });
    }

    // Enrich with results / lift
    const enriched = await Promise.all(
      filtered.map(async (exp) => {
        try {
          const resObj = await experimentResults(storeId, exp.experimentId);
          let lift = null;
          let significant = false;

          if (resObj && resObj.metrics) {
            const goalMetric =
              resObj.metrics.find((m) => m.name === exp.goal) || resObj.metrics[0];
            significant = Boolean(goalMetric?.significant);
            const totalVisitors =
              (resObj.control?.visitors || 0) + (resObj.treatment?.visitors || 0);

            if (
              totalVisitors >= 10 &&
              goalMetric?.controlRate !== undefined &&
              goalMetric?.treatmentRate !== undefined
            ) {
              if (goalMetric.controlRate > 0) {
                lift = Number(
                  (
                    ((goalMetric.treatmentRate - goalMetric.controlRate) /
                      goalMetric.controlRate) *
                    100
                  ).toFixed(1)
                );
              } else if (goalMetric.treatmentRate > 0) {
                lift = Number((goalMetric.treatmentRate * 100).toFixed(1));
              } else {
                lift = 0.0;
              }
            }
          }

          return {
            ...exp,
            results: {
              lift,
              goal: exp.goal,
              significant,
            },
          };
        } catch {
          return {
            ...exp,
            results: {
              lift: null,
              goal: exp.goal,
              significant: false,
            },
          };
        }
      })
    );

    return res.status(200).json({
      experiments: enriched,
      counts,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle POST /api/experiments
 */
export const createExperiment = async (req, res, next) => {
  try {
    const storeId = req.store?.storeId;
    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const {
      name,
      description = "",
      type = "widget_toggle",
      goal = "conversion_rate",
      variants,
      split = 0.5,
      config = {},
    } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Field 'name' is required",
        },
      });
    }

    // Check concurrency: cannot run two experiments of the same type at once
    const runningExisting = await Experiment.findOne({
      storeId,
      type,
      status: "running",
    });

    if (runningExisting) {
      const friendlyType = TYPE_NAMES[type] || "Widget on/off";
      return res.status(409).json({
        error: {
          code: "CONFLICT",
          message: `A ${friendlyType} experiment is already running. Complete it first.`,
        },
      });
    }

    const experimentId = `exp_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const newExperiment = await Experiment.create({
      experimentId,
      storeId,
      name: name.trim(),
      description: (description || "").trim(),
      type,
      goal,
      variants: {
        a: { label: variants?.a?.label?.trim() || "Original" },
        b: { label: variants?.b?.label?.trim() || "FitWise Active" },
      },
      split: typeof split === "number" ? Math.max(0.1, Math.min(0.9, split)) : 0.5,
      config: config || {},
      status: "running",
      startedAt: new Date(),
    });

    clearExperimentCache();

    return res.status(201).json(newExperiment);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle PATCH /api/experiments/:id
 * Supports changing status (running, paused, completed)
 */
export const updateExperiment = async (req, res, next) => {
  try {
    const experimentId = req.params.id;
    const storeId = req.store?.storeId;

    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const exp = await Experiment.findOne({ storeId, experimentId });
    if (!exp) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Experiment '${experimentId}' not found`,
        },
      });
    }

    const { status } = req.body;
    if (status && ["running", "paused", "completed"].includes(status)) {
      if (status === "running" && exp.status !== "running") {
        // Check if another experiment with same type is currently running
        const conflict = await Experiment.findOne({
          storeId,
          type: exp.type,
          status: "running",
          experimentId: { $ne: exp.experimentId },
        });

        if (conflict) {
          const friendlyType = TYPE_NAMES[exp.type] || exp.type;
          return res.status(409).json({
            error: {
              code: "CONFLICT",
              message: `A ${friendlyType} experiment is already running. Complete it first.`,
            },
          });
        }
      }

      exp.status = status;
      await exp.save();
      clearExperimentCache();
    }

    return res.status(200).json(exp);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle GET /api/experiments/assign?visitorId=
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const assignVariant = async (req, res, next) => {
  try {
    const visitorId = req.query.visitorId;

    if (!visitorId || typeof visitorId !== "string" || !visitorId.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Query parameter 'visitorId' is required",
        },
      });
    }

    const storeId = req.store?.storeId;
    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const result = await assign(storeId, visitorId.trim());

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

/**
 * Handle GET /api/experiments/:id/results
 * Computes statistical comparison between control and treatment variants.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export const getExperimentResults = async (req, res, next) => {
  try {
    const experimentId = req.params.id;

    if (!experimentId || typeof experimentId !== "string" || !experimentId.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Path parameter 'id' is required",
        },
      });
    }

    const storeId = req.store?.storeId;
    if (!storeId) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Store context missing",
        },
      });
    }

    const results = await experimentResults(storeId, experimentId.trim());

    if (!results) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `Experiment with ID '${experimentId}' not found`,
        },
      });
    }

    const experiment = await Experiment.findOne({
      storeId,
      experimentId: experimentId.trim(),
    }).lean();

    return res.status(200).json({
      ...results,
      experiment,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  listExperiments,
  createExperiment,
  updateExperiment,
  assignVariant,
  getExperimentResults,
};
