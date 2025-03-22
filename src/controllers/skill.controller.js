import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Skill } from "../models/skill.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { image_ID_Parser } from "../utils/imageParser.js";

const addNewSkill = asyncHandler(async (req, res, next) => {
  const { title, proficiency } = req.body;
  if (!title) {
    throw new ApiError("Title is required", 400);
  }
  if (!proficiency) {
    throw new ApiError("Proficiency is required", 400);
  }
  const svglocalPath = req.files.svg[0].path;
  const svg = await uploadOnCloudinary(svglocalPath, "svg");
  const newSkill = await Skill.create({
    title: title,
    proficiency: proficiency,
    svg: svg.url || "",
  });
  if (!newSkill) {
    return next(new ApiError("Failed to create new skill", 500));
  }
  res.status(201).json(new ApiResponse("Skill created", newSkill));
});

const getAllSkill = asyncHandler(async (req, res, next) => {
  const skills = await Skill.find({});
  if (!skills || skills.length === 0) {
    throw new ApiError("Skills not found", 404);
  }
  res.status(200).json(new ApiResponse("Skills found", skills));
});

const deleteSkill = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const skill = await Skill.findById(id);
  if (!skill) {
    throw new ApiError("Skill not found", 404);
  }
  const prevSvg = skill.svg;
  const publicId = image_ID_Parser(prevSvg);
  console.log(`Attempting to delete avatar with public ID: ${publicId}`);
  const result = await cloudinary.uploader.destroy(publicId);
  console.log(result, "deleted svg from cloudinary");
  await skill.deleteOne();
  res.status(200).json(new ApiResponse("Skill deleted", null));
});
const updateSkill = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  let skill = await Skill.findById(id);
  if (!skill) {
    throw new ApiError("Skill not found", 404);
  }
  const { title, proficiency } = req.body;
  skill = await Skill.findByIdAndUpdate(id, {
    title: title,
    proficiency: proficiency,
  });
  if (!skill) {
    return next(new ApiError("Failed to update skill", 500));
  }
  res.status(200).json(new ApiResponse("Skill updated", skill));
});
export { addNewSkill, getAllSkill, deleteSkill, updateSkill };
