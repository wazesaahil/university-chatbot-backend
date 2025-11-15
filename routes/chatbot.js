import express from "express";
import { handleMessage } from "../controllers/chatbotController.js";

const router = express.Router();

router.post("/", handleMessage);

export default router;
