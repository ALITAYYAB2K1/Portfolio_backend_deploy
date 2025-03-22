import mongoose, { Schema } from "mongoose";
const messageSchema = new Schema(
  {
    senderName: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
export const Message = mongoose.model("Message", messageSchema);
