import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Project } from "../models/project.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { image_ID_Parser } from "../utils/imageParser.js";

const addNewProject = asyncHandler(async (req, res, next) => {
  try {
    console.log("Processing add project request");

    const { title, description, projectUrl, gitRepoUrl, stack, deployed } =
      req.body;

    // Validate required fields
    if (!title || !description || !stack || deployed === undefined) {
      throw new ApiError(400, "All required fields must be provided");
    }

    // Check for image
    if (!req.files || !req.files.image || !req.files.image[0]) {
      console.log("Files in request:", req.files);
      throw new ApiError(400, "Project image is required");
    }

    // Get image file from memory
    const imageFile = req.files.image[0];

    console.log("Image file details:", {
      filename: imageFile.originalname,
      mimetype: imageFile.mimetype,
      size: imageFile.size,
    });

    // Upload image to Cloudinary
    let image;
    try {
      image = await uploadOnCloudinary(imageFile, "projects");

      if (!image || !image.url) {
        throw new Error("Image upload failed");
      }

      console.log("Cloudinary upload successful:", image.url);
    } catch (uploadError) {
      console.error("Image upload error:", uploadError);
      throw new ApiError(500, "Failed to upload project image");
    }

    // Create project
    const newProject = await Project.create({
      title,
      description,
      projectUrl: projectUrl || "",
      gitRepoUrl: gitRepoUrl || "",
      stack,
      deployed,
      image: image.url,
    });

    if (!newProject) {
      throw new ApiError(500, "Failed to create new project");
    }

    console.log("Project created successfully:", newProject._id);

    res
      .status(201)
      .json(new ApiResponse(201, newProject, "Project created successfully"));
  } catch (error) {
    console.error("Add project error:", error);
    next(error);
  }
});

const getAllProject = asyncHandler(async (req, res, next) => {
  try {
    const projects = await Project.find({}).sort({ createdAt: -1 });

    if (!projects || projects.length === 0) {
      throw new ApiError(404, "No projects found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, projects, "Projects retrieved successfully"));
  } catch (error) {
    console.error("Get projects error:", error);
    next(error);
  }
});

const deleteProject = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Project ID is required");
    }

    const project = await Project.findById(id);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Delete image from Cloudinary
    if (project.image) {
      try {
        const publicId = image_ID_Parser(project.image);
        console.log(
          `Attempting to delete project image with public ID: ${publicId}`
        );

        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Cloudinary delete result:", result);
      } catch (cloudinaryError) {
        console.error("Error deleting image from Cloudinary:", cloudinaryError);
        // Continue with deletion even if Cloudinary fails
      }
    }

    // Delete project from database
    await project.deleteOne();

    res
      .status(200)
      .json(new ApiResponse(200, null, "Project deleted successfully"));
  } catch (error) {
    console.error("Delete project error:", error);
    next(error);
  }
});

const updateProject = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Project ID is required");
    }

    // Check if project exists
    const project = await Project.findById(id);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Create update object with existing values as defaults
    const updateData = {
      title: req.body.title || project.title,
      description: req.body.description || project.description,
      projectUrl: req.body.projectUrl || project.projectUrl,
      gitRepoUrl: req.body.gitRepoUrl || project.gitRepoUrl,
      stack: req.body.stack || project.stack,
      deployed:
        req.body.deployed !== undefined ? req.body.deployed : project.deployed,
    };

    // Handle image update if provided
    if (req.files && req.files.image && req.files.image[0]) {
      const imageFile = req.files.image[0];
      const previousImage = project.image;

      console.log("Updating project image:", imageFile.originalname);

      // Upload new image
      try {
        const image = await uploadOnCloudinary(imageFile, "projects");

        if (!image || !image.url) {
          throw new Error("Image upload failed");
        }

        updateData.image = image.url;

        // Delete previous image if it exists
        if (previousImage) {
          try {
            const publicId = image_ID_Parser(previousImage);
            console.log(`Deleting previous project image: ${publicId}`);

            const result = await cloudinary.uploader.destroy(publicId);
            console.log("Image deletion result:", result);
          } catch (error) {
            console.error("Error deleting previous image:", error);
            // Continue with update even if deletion fails
          }
        }
      } catch (uploadError) {
        console.error("Image update error:", uploadError);
        throw new ApiError(500, "Failed to update project image");
      }
    }

    // Update project in database
    const updatedProject = await Project.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProject) {
      throw new ApiError(500, "Failed to update project");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, updatedProject, "Project updated successfully")
      );
  } catch (error) {
    console.error("Update project error:", error);
    next(error);
  }
});

const getProject = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Project ID is required");
    }

    const project = await Project.findById(id);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, project, "Project retrieved successfully"));
  } catch (error) {
    console.error("Get project error:", error);
    next(error);
  }
});

export {
  addNewProject,
  getAllProject,
  deleteProject,
  updateProject,
  getProject,
};
