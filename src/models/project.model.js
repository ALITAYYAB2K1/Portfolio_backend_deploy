import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  projectUrl: {
    type: String,
  },
  gitRepoUrl: {
    type: String,
  },
  stack: {
    type: String,
  },
  deployed: {
    type: String,
  },
  image: {
    type: String,
  },
});

export const Project = mongoose.model("Project", projectSchema);
