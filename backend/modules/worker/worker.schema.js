import mongoose from "mongoose";

const WorkerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    city: { type: String },
    categories: { type: [String], default: [] },
    primary_language: { type: String },
    literacy_level: { type: String },
    certifications: { type: [String], default: [] },
    rating: { type: Number, default: 0 },
    total_tasks: { type: Number, default: 0 },
    avg_task_time: { type: Number },
    last_active: { type: Date },
    preferred_contact_method: { type: String },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Helper to accept pipe- or comma-separated categories when seeding/creating
WorkerSchema.pre('save', function (next) {
  if (this.categories && typeof this.categories === 'string') {
    this.categories = this.categories.split(/[|,]/).map(s => s.trim()).filter(Boolean);
  }
  if (this.certifications && typeof this.certifications === 'string') {
    this.certifications = this.certifications.split(/[|,]/).map(s => s.trim()).filter(Boolean);
  }
  next();
});

const Worker = mongoose.model("Worker", WorkerSchema);

export default Worker;
