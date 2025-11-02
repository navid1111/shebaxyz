import express from "express";
import { registerUser, loginUser } from "./auth.controller.js";
import { protect, authorizeRoles } from "./auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// Example protected route
router.get(
  "/student-dashboard",
  protect,
  authorizeRoles("Student"),
  (req, res) => {
    res.json({ message: `Welcome ${req.user.name}, you're a student` });
  }
);

router.get("/tutor-dashboard", protect, authorizeRoles("Tutor"), (req, res) => {
  res.json({ message: `Welcome ${req.user.name}, you're a tutor` });
});

export default router;
