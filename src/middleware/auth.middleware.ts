import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { sendError } from "../utils/response";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

interface JwtUser {
  id: number;
  name: string;
  role: string;
}

// Auth middleware
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  // header check
  if (!authHeader) {
    return sendError(res, StatusCodes.UNAUTHORIZED, "No token provided");
  }

  // Bearer check
  if (!authHeader.startsWith("Bearer ")) {
    return sendError(
      res,
      StatusCodes.UNAUTHORIZED,
      "Invalid authorization format",
    );
  }

  // token extract
  const token = authHeader.split(" ")[1];
  if (!token) {
    return sendError(res, StatusCodes.UNAUTHORIZED, "Token missing");
  }
  try {
    // token verify
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as unknown as JwtUser;

    req.user = decoded;

    next();
  } catch (err) {
    return sendError(res, StatusCodes.UNAUTHORIZED, "Invalid or expired token");
  }
};

// RBAC — maintainer only
export const requireMaintainer = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "maintainer") {
    return sendError(res, StatusCodes.FORBIDDEN, "Maintainer access required");
  }

  next();
};
