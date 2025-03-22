import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { SoftwareApplication } from "../models/softwareApplication.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { image_ID_Parser } from "../utils/imageParser.js";
const addNewApplication = asyncHandler(async (req, res, next) => {
  const { name } = req.body;
  if (!name) {
    throw new ApiError("Name is required", 400);
  }
  if (!req.files || !req.files.svg) {
    throw new ApiError("SVG is required", 400);
  }
  const svglocalPath = req.files.svg[0].path;
  const svg = await uploadOnCloudinary(svglocalPath, "svg");
  const newApplication = await SoftwareApplication.create({
    name: name,
    svg: svg.url || "",
  });
  if (!newApplication) {
    return next(new ApiError("Failed to create new application", 500));
  }
  res.status(201).json(new ApiResponse("Application created", newApplication));
});

const getAllApplication = asyncHandler(async (req, res, next) => {
  const applications = await SoftwareApplication.find({});
  if (!applications || applications.length === 0) {
    throw new ApiError("Applications not found", 404);
  }
  res.status(200).json(new ApiResponse("Applications found", applications));
});

const deleteApplication = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const application = await SoftwareApplication.findById(id);
  if (!application) {
    throw new ApiError("Application not found", 404);
  }
  const prevSvg = application.svg;
  const publicId = image_ID_Parser(prevSvg);
  console.log(`Attempting to delete avatar with public ID: ${publicId}`);
  const result = await cloudinary.uploader.destroy(publicId);
  console.log(result, "deleted svg from cloudinary");
  await application.deleteOne();
  res.status(200).json(new ApiResponse("Application deleted", null));
});

export { addNewApplication, getAllApplication, deleteApplication };
