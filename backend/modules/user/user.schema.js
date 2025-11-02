import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          // Bangladeshi phone number: starts with +8801 or 01, then 9 digits
          return /^((\+8801|01)[0-9]{9})$/.test(v);
        },
        message: props => `${props.value} is not a valid Bangladeshi phone number!`
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    is_active: { type: Boolean, default: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: [ "admin", "worker", "user"],
      required: true,
      default: "user",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);

export default User;
