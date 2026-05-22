import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { sendError } from "../utils/response";

export interface AuthRequest extends Request {
  user?: { id: number; name: string; role: string };
}

// Auth middleware
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers["authorization"];
  if (!token)
    return sendError(res, StatusCodes.UNAUTHORIZED, "No token provided");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
      name: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch {
    sendError(res, StatusCodes.UNAUTHORIZED, "Invalid or expired token");
  }
};

// RBAC — maintainer only
export const requireMaintainer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "maintainer")
    return sendError(res, StatusCodes.FORBIDDEN, "Maintainer access required");
  next();
};
