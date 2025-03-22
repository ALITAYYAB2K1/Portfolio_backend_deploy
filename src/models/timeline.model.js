import mongoose, { Schema } from "mongoose";
const timelineSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    timeline: {
      from: {
        type: String,
        required: true,
      },
      to: String,
    },
  },
  { timestamps: true }
);
export const Timeline = mongoose.model("Timeline", timelineSchema);
