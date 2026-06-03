import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/authorize.js";
import { uploadSingleAttachment } from "../../middleware/upload.js";
import { Permission } from "../authorization/permissions.js";
import { asyncHandler } from "../../utils/http.js";
import { jobsController } from "./jobs.controller.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(jobsController.list));
router.post("/", requireAuth, requirePermission(Permission.JobCreate), asyncHandler(jobsController.create));
router.get("/:id", requireAuth, asyncHandler(jobsController.getById));
router.patch("/:id/assign", requireAuth, requirePermission(Permission.JobAssign), asyncHandler(jobsController.assign));
router.patch("/:id/status", requireAuth, asyncHandler(jobsController.updateStatus));
router.post("/:id/notes", requireAuth, asyncHandler(jobsController.createNote));
router.post("/:id/attachments", requireAuth, uploadSingleAttachment, asyncHandler(jobsController.uploadAttachment));

export default router;
