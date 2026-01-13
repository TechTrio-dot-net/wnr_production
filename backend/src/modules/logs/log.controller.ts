import { Request, Response } from "express";
import LogModel from "./log.model";
import { logger } from "../../lib/logger";
import type { Model } from "mongoose";
import type { ILog } from "./log.model";

interface LogRequestBody {
  level: "info" | "warn" | "error" | "success";
  action: string;
  message: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function createLog(req: Request, res: Response): Promise<void> {
  try {
    const body: LogRequestBody = req.body;

    // Validate required fields
    if (!body.level || !body.action || !body.message) {
      res.status(400).json({
        error: "Missing required fields: level, action, message",
      });
      return;
    }

    // Validate level
    if (!["info", "warn", "error", "success"].includes(body.level)) {
      res.status(400).json({
        error: "Invalid level. Must be one of: info, warn, error, success",
      });
      return;
    }

    // Extract user info from request (if available)
    const userId = (req as any).user?.uid || (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get("user-agent");

    // Create log entry
    const logEntry = new LogModel({
      level: body.level,
      action: body.action,
      message: body.message,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
      metadata: body.metadata,
      userId,
      userEmail,
      ipAddress,
      userAgent,
    });

    await logEntry.save();

    // Return success (fire-and-forget style, but acknowledge receipt)
    res.status(201).json({
      success: true,
      id: logEntry._id,
    });
  } catch (error) {
    logger.error("Failed to create log entry", { error: error instanceof Error ? error.message : String(error) });
    // Still return success to not interrupt user flow
    res.status(201).json({
      success: true,
      note: "Log may not have been saved",
    });
  }
}

export async function getLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Optional filters
    if (req.query.level) {
      filter.level = req.query.level;
    }
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const Log = LogModel as Model<ILog>;
    
    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Log.countDocuments(filter),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch logs", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: "Failed to fetch logs",
    });
  }
}

