import bcrypt from "bcryptjs";
import User from "../user/user.schema.js";
import generateToken from "../../utils/generateToken.js";

export const register = async (name, email, password, role, phone) => {
  const userExists = await User.findOne({ email });
  if (userExists) throw new Error("User already exists");

  if (!/^((\+8801|01)[0-9]{9})$/.test(phone)) {
    throw new Error("Invalid Bangladeshi phone number");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    phone,
  });

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    token: generateToken(user),
  };
};

export const login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    token: generateToken(user),
  };
};
