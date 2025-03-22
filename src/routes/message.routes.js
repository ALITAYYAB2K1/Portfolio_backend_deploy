import { Router } from "express";
import {
  getAllMessages,
  sendMessage,
  deleteMessage,
} from "../controllers/message.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.route("/send").post(sendMessage);
//secure routes
router.route("/getall").get(verifyJWT, getAllMessages);
router.route("/delete/:id").delete(verifyJWT, deleteMessage);

export default router;
