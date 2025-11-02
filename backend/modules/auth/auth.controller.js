import * as authService from "./auth.service.js";

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!["Student", "Tutor"].includes(role)) {
      return res.status(400).json({ message: "Invalid Role" });
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
