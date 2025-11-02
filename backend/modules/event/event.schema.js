import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    page: { type: String },
    time_spent: { type: Number },
    timestamp: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Allow seeding to set _id from `event_id` in CSV.

const Event = mongoose.model("Event", EventSchema);

export default Event;
