import { Router } from "express";
import {
  authenticate,
  requireMaintainer,
} from "../../middleware/auth.middleware";
import * as controller from "./issues.controller";

const router = Router();
router.post("/", authenticate, controller.createIssue);
router.get("/", controller.getAllIssues);
router.get("/:id", controller.getSingleIssue);
router.patch("/:id", authenticate, controller.updateIssue);
router.delete("/:id", authenticate, requireMaintainer, controller.deleteIssue);
export default router;
