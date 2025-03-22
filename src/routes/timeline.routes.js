import { Router } from "express";
import {
  addTimeline,
  getAllTimelines,
  deleteTimeline,
} from "../controllers/timeline.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
//secure routes
router.route("/add").post(verifyJWT, addTimeline);
router.route("/getall").get(getAllTimelines);
router.route("/delete/:id").delete(verifyJWT, deleteTimeline);

export default router;
