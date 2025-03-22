import mongoose, { Schema } from "mongoose";

const skillSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  proficiency: {
    type: String,
    required: true,
  },
  svg: {
    type: String,
  },
});

export const Skill = mongoose.model("Skill", skillSchema);
