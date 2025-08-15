import express from "express";
import aiController, { openrouterChat } from "../controllers/aiController.js";
// OpenRouter AI Chat endpoint
const router = express.Router();
router.post("/openrouter-chat", openrouterChat);


// AI Chatbot endpoint (Gemini-powered)
router.post("/chat", aiController.chat);

// Generate impact score (Gemini-powered)
router.post("/impact-score", aiController.getImpactScore);

export default router;
