import mongoose from "mongoose";
import { Group } from "../models/Group.js";

/**
 * GET /api/community/groups?tab=discover|mine
 * Secret key required.
 */
export const getGroups = async (req, res, next) => {
  try {
    const { tab } = req.query;

    const query = {};
    if (tab === "mine") {
      query.joined = true;
    } else if (tab === "discover") {
      query.joined = false;
    }

    const groups = await Group.find(query)
      .sort({ memberCount: -1, createdAt: -1 })
      .lean();

    return res.status(200).json(groups);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/community/groups
 * Secret key required. Creates a community group authored by store owner.
 */
export const createGroup = async (req, res, next) => {
  try {
    const { name, description, category, memberCount, imageUrl, joined, isDemo } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: {
          code: "BAD_REQUEST",
          message: "Group name is required",
        },
      });
    }

    const isJoined = joined !== undefined ? Boolean(joined) : true;
    const initialMemberCount =
      memberCount !== undefined && Number.isFinite(Number(memberCount))
        ? Math.max(0, Number(memberCount))
        : isJoined
        ? 1
        : 0;

    const group = await Group.create({
      name: name.trim(),
      description: description ? String(description).trim() : "",
      category: category ? String(category).trim() : "general",
      memberCount: initialMemberCount,
      imageUrl: imageUrl ? String(imageUrl).trim() : null,
      joined: isJoined,
      isDemo: Boolean(isDemo),
      storeId: req.store?.storeId || null,
    });

    return res.status(201).json(group);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/community/groups/:id/join
 * Secret key required. Joins a community group.
 */
export const joinGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Group not found",
        },
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Group not found",
        },
      });
    }

    if (!group.joined) {
      group.joined = true;
      group.memberCount = (group.memberCount || 0) + 1;
      await group.save();
    }

    return res.status(200).json(group);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/community/groups/:id/leave
 * Secret key required. Leaves a community group.
 */
export const leaveGroup = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Group not found",
        },
      });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Group not found",
        },
      });
    }

    if (group.joined) {
      group.joined = false;
      group.memberCount = Math.max(0, (group.memberCount || 1) - 1);
      await group.save();
    }

    return res.status(200).json(group);
  } catch (error) {
    return next(error);
  }
};

export default {
  getGroups,
  createGroup,
  joinGroup,
  leaveGroup,
};
