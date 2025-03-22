import { Router } from "express";
import {
  addNewApplication,
  getAllApplication,
  deleteApplication,
} from "../controllers/softwareApplication.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
//secure routes
router
  .route("/add")
  .post(
    verifyJWT,
    upload.fields([{ name: "svg", maxCount: 1 }]),
    addNewApplication
  );
router.route("/getall").get(getAllApplication);
router.route("/delete/:id").delete(verifyJWT, deleteApplication);

export default router;
