import type { Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { AuthRequest } from "../../middleware/auth.middleware";
import { sendSuccess, sendError } from "../../utils/response";
import * as issueService from "./issues.service";

export const createIssue = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, type } = req.body;
    const data = await issueService.createIssue(
      title,
      description,
      type,
      req.user!.id,
    );
    sendSuccess(res, StatusCodes.CREATED, "Issue created successfully", data);
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};

export const getAllIssues = async (req: AuthRequest, res: Response) => {
  try {
    const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";
    const type =
      typeof req.query.type === "string" ? req.query.type : undefined;
    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const data = await issueService.getAllIssues(sort, type, status);
    sendSuccess(res, StatusCodes.OK, "Issues fetched successfully", data);
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};

export const getSingleIssue = async (req: AuthRequest, res: Response) => {
  try {
    const data = await issueService.getSingleIssue(
      parseInt(req.params.id as string),
    );
    sendSuccess(res, StatusCodes.OK, "Issue fetched successfully", data);
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};

export const updateIssue = async (req: AuthRequest, res: Response) => {
  try {
    const data = await issueService.updateIssue(
      parseInt(req.params.id as string),
      req.body,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, StatusCodes.OK, "Issue updated successfully", data);
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};

export const deleteIssue = async (req: AuthRequest, res: Response) => {
  try {
    await issueService.deleteIssue(parseInt(req.params.id as string));
    sendSuccess(res, StatusCodes.OK, "Issue deleted successfully");
  } catch (err: any) {
    sendError(res, err.status || 500, err.message);
  }
};
