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
    console.log("Request body:", req.body);
    console.log(
      "Files received:",
      req.files ? Object.keys(req.files) : "No files"
    );

    const { name } = req.body;

    if (!name) {
      throw new ApiError("Name is required", 400);
    }

    if (!req.files || !req.files.svg || !req.files.svg[0]) {
      throw new ApiError("SVG file is required", 400);
    }

    // Get the file from memory
    const svgFile = req.files.svg[0];
    console.log("SVG file details:", {
      fieldname: svgFile.fieldname,
      originalname: svgFile.originalname,
      mimetype: svgFile.mimetype,
      size: svgFile.size,
      // Add buffer info without logging the actual buffer
      buffer: svgFile.buffer ? "Buffer present" : "No buffer",
    });

    // Upload directly from memory
    const svg = await uploadOnCloudinary(svgFile, "svg");

    if (!svg || !svg.url) {
      throw new ApiError("Failed to upload SVG to Cloudinary", 500);
    }

    console.log("Cloudinary upload successful:", svg.url);

    const newApplication = await SoftwareApplication.create({
      name: name,
      svg: svg.url || "",
    });

    if (!newApplication) {
      throw new ApiError("Failed to create new application", 500);
    }

    console.log("Application created successfully");
    res
      .status(201)
      .json(new ApiResponse(201, newApplication, "Application created"));
  } catch (error) {
    console.error("Application creation error:", error);
    next(error);
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
