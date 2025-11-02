import User from "../user/user.schema.js";
import Worker from "../worker/worker.schema.js";
import Event from "../event/event.schema.js";
import Otp from "../auth/otp.schema.js";

const getStats = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const workers = await Worker.countDocuments();
    const events = await Event.countDocuments();
    const otps = await Otp.countDocuments();

    res.json({ users, workers, events, otps });
  } catch (err) {
    console.error("admin.getStats error", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

export { getStats };
