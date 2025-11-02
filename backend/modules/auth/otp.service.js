import Otp from "./otp.schema.js";
import User from "../user/user.schema.js";
import { sendSms } from "./sms.service.js";
import crypto from "crypto";

const generateCode = () => {
  // 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const requestOtp = async (phone, opts = {}) => {
  const ttlSecs = parseInt(process.env.OTP_TTL_SECS || "300", 10); // default 5 minutes

  // Basic abuse protection: limit requests per phone per hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await Otp.countDocuments({ phone, createdAt: { $gte: hourAgo } });
  if (recentCount >= (parseInt(process.env.OTP_MAX_PER_HOUR || "10", 10))) {
    const e = new Error("Too many OTP requests, try later");
    e.status = 429;
    throw e;
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + ttlSecs * 1000);

  await Otp.create({ phone, code, expiresAt });

  // send SMS (mock by default)
  await sendSms(phone, `Your verification code is: ${code}`);

  return { phone, ttl: ttlSecs };
};

export const verifyOtp = async (phone, code) => {
  const otp = await Otp.findOne({ phone, code, used: false }).sort({ createdAt: -1 });
  if (!otp) {
    const e = new Error("Invalid or expired OTP");
    e.status = 401;
    throw e;
  }

  if (otp.expiresAt < new Date()) {
    const e = new Error("OTP expired");
    e.status = 401;
    throw e;
  }

  // mark used
  otp.used = true;
  await otp.save();

  // find or create user by phone
  let user = await User.findOne({ phone });
  if (!user) {
    // create lightweight user with default role 'user'
    user = await User.create({ name: phone, phone, email: `${phone}@noemail.local`, password: crypto.randomBytes(16).toString("hex"), role: "user" });
  }

  return user;
};

export default { requestOtp, verifyOtp };
