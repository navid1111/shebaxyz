import express from "express";
import { protect, requireRole } from "../auth/auth.middleware.js";
import { getStats } from "./admin.controller.js";

const router = express.Router();

// Admin-only stats endpoint
router.get("/stats", protect, requireRole("admin"), getStats);

export default router;
