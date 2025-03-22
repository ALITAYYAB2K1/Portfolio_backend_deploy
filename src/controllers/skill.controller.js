import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Skill } from "../models/skill.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { image_ID_Parser } from "../utils/imageParser.js";

const addNewSkill = asyncHandler(async (req, res, next) => {
  try {
    console.log("Processing add skill request");

    const { title, proficiency } = req.body;

    // Validate inputs
    if (!title) {
      throw new ApiError(400, "Title is required");
    }

    if (!proficiency) {
      throw new ApiError(400, "Proficiency is required");
    }

    // Check for SVG file
    if (!req.files || !req.files.svg || !req.files.svg[0]) {
      console.log("Files in request:", req.files);
      throw new ApiError(400, "SVG file is required");
    }

    // Get the SVG file from memory
    const svgFile = req.files.svg[0];

    console.log("SVG file details:", {
      fieldname: svgFile.fieldname,
      originalname: svgFile.originalname,
      mimetype: svgFile.mimetype,
      size: svgFile.size,
    });

    // Upload SVG to Cloudinary
    let svg;
    try {
      svg = await uploadOnCloudinary(svgFile, "skills");

      if (!svg || !svg.url) {
        throw new Error("SVG upload failed");
      }

      console.log("Cloudinary upload successful:", svg.url);
    } catch (uploadError) {
      console.error("SVG upload error:", uploadError);
      throw new ApiError(500, "Failed to upload skill icon");
    }

    // Create skill record
    const newSkill = await Skill.create({
      title,
      proficiency,
      svg: svg.url,
    });

    if (!newSkill) {
      throw new ApiError(500, "Failed to create new skill");
    }

    console.log("Skill created successfully:", newSkill._id);

    res
      .status(201)
      .json(new ApiResponse(201, newSkill, "Skill created successfully"));
  } catch (error) {
    console.error("Add skill error:", error);
    next(error);
  }
});

const getAllSkill = asyncHandler(async (req, res, next) => {
  try {
    const skills = await Skill.find({}).sort({ proficiency: -1 });

    if (!skills || skills.length === 0) {
      throw new ApiError(404, "No skills found");
    }

    res
      .status(200)
      .json(new ApiResponse(200, skills, "Skills retrieved successfully"));
  } catch (error) {
    console.error("Get skills error:", error);
    next(error);
  }
});

const deleteSkill = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Skill ID is required");
    }

    const skill = await Skill.findById(id);

    if (!skill) {
      throw new ApiError(404, "Skill not found");
    }

    // Delete SVG from Cloudinary
    if (skill.svg) {
      try {
        const publicId = image_ID_Parser(skill.svg);
        console.log(
          `Attempting to delete skill icon with public ID: ${publicId}`
        );

        const result = await cloudinary.uploader.destroy(publicId);
        console.log("Cloudinary delete result:", result);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue with deletion even if Cloudinary fails
      }
    }

    // Delete skill from database
    await skill.deleteOne();

    res
      .status(200)
      .json(new ApiResponse(200, null, "Skill deleted successfully"));
  } catch (error) {
    console.error("Delete skill error:", error);
    next(error);
  }
});

const updateSkill = asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Skill ID is required");
    }

    // Check if skill exists
    let skill = await Skill.findById(id);

    if (!skill) {
      throw new ApiError(404, "Skill not found");
    }

    const { title, proficiency } = req.body;

    // Create update object
    const updateData = {
      title: title || skill.title,
      proficiency: proficiency || skill.proficiency,
    };

    // Handle SVG update if provided
    if (req.files && req.files.svg && req.files.svg[0]) {
      const svgFile = req.files.svg[0];
      const previousSvg = skill.svg;

      // Delete previous SVG if it exists
      if (previousSvg) {
        try {
          const publicId = image_ID_Parser(previousSvg);
          console.log(`Deleting previous skill icon: ${publicId}`);

          const result = await cloudinary.uploader.destroy(publicId);
          console.log("Icon deletion result:", result);
        } catch (error) {
          console.error("Error deleting previous icon:", error);
          // Continue with upload even if deletion fails
        }
      }

      // Upload new SVG
      try {
        const svg = await uploadOnCloudinary(svgFile, "skills");

        if (!svg || !svg.url) {
          throw new Error("SVG upload failed");
        }

        updateData.svg = svg.url;
      } catch (uploadError) {
        console.error("SVG update error:", uploadError);
        throw new ApiError(500, "Failed to update skill icon");
      }
    }

    // Update skill in database
    const updatedSkill = await Skill.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedSkill) {
      throw new ApiError(500, "Failed to update skill");
    }

    res
      .status(200)
      .json(new ApiResponse(200, updatedSkill, "Skill updated successfully"));
  } catch (error) {
    console.error("Update skill error:", error);
    next(error);
  }
});

export { addNewSkill, getAllSkill, deleteSkill, updateSkill };
