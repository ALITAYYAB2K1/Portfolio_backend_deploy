import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  updateUserProfile,
  updatePassword,
  getUserForPortfolio,
  forgotPassword,
  resetPassword,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  registerUser
);

router.route("/login").post(loginUser);
router.route("/portfolio").get(getUserForPortfolio);
router.route("/password/forgot").post(forgotPassword);
//secure routes below
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getUser);
router.route("/update/me").put(
  verifyJWT,
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "resume", maxCount: 1 },
  ]),
  updateUserProfile
);
router.route("/update/password").patch(verifyJWT, updatePassword);
router.route("/password/reset/:resetToken").put(resetPassword);
export default router;
