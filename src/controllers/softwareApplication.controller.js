import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { SoftwareApplication } from "../models/softwareApplication.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { image_ID_Parser } from "../utils/imageParser.js";

const addNewApplication = asyncHandler(async (req, res, next) => {
  try {
    console.log("Processing application creation request");

    // Log request details
    console.log("Request body:", req.body);
    console.log(
      "Files received:",
      req.files ? Object.keys(req.files) : "No files"
    );

    const { name } = req.body;

    if (!name) {
      throw new ApiError(400, "Name is required");
    }

    if (!req.files || !req.files.svg || !req.files.svg[0]) {
      throw new ApiError(400, "SVG file is required");
    }

    const svgFile = req.files.svg[0];

    // Handle SVG upload with direct error handling
    let svg;
    try {
      svg = await uploadOnCloudinary(svgFile, "applications");

      if (!svg || !svg.url) {
        throw new Error("Cloudinary upload failed");
      }
    } catch (uploadError) {
      console.error("SVG upload error:", uploadError);
      throw new ApiError(500, `Failed to upload SVG: ${uploadError.message}`);
    }

    console.log("Creating application with:", { name, svgUrl: svg.url });

    const newApplication = await SoftwareApplication.create({
      name,
      svg: svg.url,
    });

    res
      .status(201)
      .json(
        new ApiResponse(201, newApplication, "Application created successfully")
      );
  } catch (error) {
    console.error("Application creation error:", error);

    // Explicitly handle the error instead of passing to next
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during application creation",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

const getAllApplication = asyncHandler(async (req, res, next) => {
  const applications = await SoftwareApplication.find({});
  if (!applications || applications.length === 0) {
    throw new ApiError("Applications not found", 404);
  }
  res
    .status(200)
    .json(new ApiResponse(200, applications, "Applications found"));
});

const deleteApplication = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const application = await SoftwareApplication.findById(id);
  if (!application) {
    throw new ApiError("Application not found", 404);
  }

  try {
    const prevSvg = application.svg;
    const publicId = image_ID_Parser(prevSvg);
    console.log(`Attempting to delete SVG with public ID: ${publicId}`);

    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Cloudinary delete result:", result);

    await application.deleteOne();
    res.status(200).json(new ApiResponse(200, null, "Application deleted"));
  } catch (error) {
    console.error("Error deleting application:", error);
    next(new ApiError("Failed to delete application", 500));
  }
});

export { addNewApplication, getAllApplication, deleteApplication };
