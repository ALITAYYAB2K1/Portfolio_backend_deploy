import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Timeline } from "../models/timeline.model.js";

const addTimeline = asyncHandler(async (req, res, next) => {
  const { title, description, from, to } = req.body;
  const timeline = await Timeline.create({
    title,
    description,
    timeline: { from, to },
  });
  if (!timeline) {
    return next(new ApiError("Timeline not created", 400));
  }
  res
    .status(201)
    .json(new ApiResponse("Timeline created successfully", timeline));
});

const getAllTimelines = asyncHandler(async (req, res, next) => {
  const timelines = await Timeline.find({});
  if (!timelines) {
    return next(new ApiError("No timelines found", 404));
  }
  res.status(200).json(new ApiResponse("All timelines", timelines));
});

const deleteTimeline = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const timelines = await Timeline.findById(id);
  if (!timelines) {
    return next(new ApiError("No timelines found", 404));
  }
  await timelines.deleteOne();
  res
    .status(200)
    .json(new ApiResponse("Timeline deleted successfully", timelines));
});

export { addTimeline, getAllTimelines, deleteTimeline };
