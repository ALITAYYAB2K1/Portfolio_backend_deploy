import { Router } from "express";
import {
  addNewProject,
  getAllProject,
  deleteProject,
  updateProject,
  getProject,
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
//secure routes
router
  .route("/add")
  .post(
    verifyJWT,
    upload.fields([{ name: "image", maxCount: 1 }]),
    addNewProject
  );
router.route("/getall").get(getAllProject);
router.route("/delete/:id").delete(verifyJWT, deleteProject);
router
  .route("/update/:id")
  .put(
    verifyJWT,
    upload.fields([{ name: "image", maxCount: 1 }]),
    updateProject
  );
router.route("/get/:id").get(getProject);

export default router;
