import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { registerUser, loginUser } from "./auth.service";
import { sendSuccess, sendError } from "../../utils/response";

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return sendError(res, StatusCodes.BAD_REQUEST, "All fields required");
    const data = await registerUser(name, email, password, role);
    sendSuccess(res, StatusCodes.CREATED, "User registered successfully", data);
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return sendError(res, StatusCodes.BAD_REQUEST, "All fields required");
    const data = await loginUser(email, password);
    sendSuccess(res, StatusCodes.OK, "Login successful", data);
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};
