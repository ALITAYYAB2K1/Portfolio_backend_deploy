import { Router } from "express";
import {
  addNewSkill,
  getAllSkill,
  deleteSkill,
  updateSkill,
} from "../controllers/skill.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
//secure routes
router
  .route("/add")
  .post(verifyJWT, upload.fields([{ name: "svg", maxCount: 1 }]), addNewSkill);
router.route("/getall").get(getAllSkill);
router.route("/delete/:id").delete(verifyJWT, deleteSkill);
router.route("/update/:id").put(verifyJWT, updateSkill);

export default router;
