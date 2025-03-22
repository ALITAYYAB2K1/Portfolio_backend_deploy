import mongoose, { Schema } from "mongoose";

const softwareApplicationSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  svg: {
    type: String,
    required: [true, "SVG is required"],
  },
});

export const SoftwareApplication = mongoose.model(
  "SoftwareApplication",
  softwareApplicationSchema
);
