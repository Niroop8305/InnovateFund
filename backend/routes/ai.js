import express from "express";
import aiController from "../controllers/aiController.js";

const router = express.Router();

// AI Chatbot endpoint (Gemini-powered)
router.post("/chat", aiController.chat);

// Generate impact score (Gemini-powered)
router.post("/impact-score", aiController.getImpactScore);

export default router;
