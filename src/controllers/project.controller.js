import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { image_ID_Parser } from "../utils/imageParser.js";

const addNewProject = asyncHandler(async (req, res, next) => {
  const { title, description, projectUrl, gitRepoUrl, stack, deployed } =
    req.body;
  if (!title || !description || !stack || !deployed) {
    throw new ApiError("All fields are required", 400);
  }
  if (!req.files && !req.files.image) {
    throw new ApiError("Image is required", 400);
  }
  const imageLocalPath = req.files.image[0].path;
  const image = await uploadOnCloudinary(imageLocalPath, "image");
  if (!image) {
    throw new ApiError("Failed to upload image", 500);
  }
  const newProject = await Project.create({
    title: title,
    description: description,
    projectUrl: projectUrl,
    gitRepoUrl: gitRepoUrl,
    stack: stack,
    deployed: deployed,
    image: image.url || "",
  });
  if (!newProject) {
    return next(new ApiError("Failed to create new project", 500));
  }
  res.status(201).json(new ApiResponse("Project created", newProject));
});

const getAllProject = asyncHandler(async (req, res, next) => {
  const projects = await Project.find({});
  if (!projects || projects.length === 0) {
    throw new ApiError("Projects not found", 404);
  }
  res.status(200).json(new ApiResponse("Projects found", projects));
});

const deleteProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError("Project not found", 404);
  }
  const prevImage = project.image;
  const publicId = image_ID_Parser(prevImage);
  console.log(`Attempting to delete image with public ID: ${publicId}`);
  const result = await cloudinary.uploader.destroy(publicId);
  console.log(result, "deleted image from cloudinary");
  await project.deleteOne();
  res.status(200).json(new ApiResponse("Project deleted", null));
});

const updateProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  let project = await Project.findById(id);
  if (!project) {
    throw new ApiError("Project not found", 404);
  }
  const newProject = {
    title: req.body.title,
    description: req.body.description,
    projectUrl: req.body.projectUrl,
    gitRepoUrl: req.body.gitRepoUrl,
    stack: req.body.stack,
    deployed: req.body.deployed,
  };
  if (req.files && req.files.image) {
    const imageLocalPath = req.files.image[0].path;
    const image = await uploadOnCloudinary(imageLocalPath, "image");
    if (!image) {
      throw new ApiError("Failed to upload image", 500);
    }
    newProject.image = image.url;
    const prevImage = project.image;
    const publicId = image_ID_Parser(prevImage);
    console.log(`Attempting to delete image with public ID: ${publicId}`);
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(result, "deleted image from cloudinary");
  }
  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    newProject,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedProject) {
    return next(new ApiError("Failed to update project", 500));
  }
  res.status(200).json(new ApiResponse("Project updated", updatedProject));
});

const getProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) {
    throw new ApiError("Project not found", 404);
  }
  res.status(200).json(new ApiResponse("Project found", project));
});

export {
  addNewProject,
  getAllProject,
  deleteProject,
  updateProject,
  getProject,
};
