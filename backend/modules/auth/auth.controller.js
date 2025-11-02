import * as authService from "./auth.service.js";
import * as otpService from "./otp.service.js";
import generateToken from "../../utils/generateToken.js";

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // allowed roles in this system
    if (!["user", "worker", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Allowed roles: user, worker, admin" });
    }

    const user = await authService.register(name, email, password, role, phone);
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);

    res.status(200).json(user);
  } catch (err) {
    res.status(401).json({ message: err.message });
  }
};

export { registerUser, loginUser };

const requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "phone is required" });
    const result = await otpService.requestOtp(phone);
    res.status(200).json({ message: "OTP sent", ...result });
  } catch (err) {
    res.status(err.status || 400).json({ message: err.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ message: "phone and code are required" });
    const user = await otpService.verifyOtp(phone, code);
    // generate JWT using existing util
    const token = generateToken(user);
    res.status(200).json({ _id: user._id, name: user.name, phone: user.phone, role: user.role, token });
  } catch (err) {
    res.status(err.status || 401).json({ message: err.message });
  }
};

export { requestOtp, verifyOtp };
