import express from "express";
import { registerUser, loginUser, requestOtp, verifyOtp } from "./auth.controller.js";
import { protect, authorizeRoles } from "./auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);

// Example protected routes (updated to use user/worker roles)
router.get(
  "/user-dashboard",
  protect,
  authorizeRoles("user"),
  (req, res) => {
    res.json({ message: `Welcome ${req.user.name}, you're a user` });
  }
);

router.get(
  "/worker-dashboard",
  protect,
  authorizeRoles("worker"),
  (req, res) => {
    res.json({ message: `Welcome ${req.user.name}, you're a worker` });
  }
);

export default router;
