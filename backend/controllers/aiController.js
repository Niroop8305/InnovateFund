import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const COHERE_API_KEY = process.env.COHERE_API_KEY;
const COHERE_API_URL = "https://api.cohere.ai/v1/chat";

const chat = async (req, res) => {
  try {
    const prompt = req.body.prompt || req.body.message;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }
    if (!COHERE_API_KEY) {
      // Dummy AI response for development/demo
      return res.json({
        response: `AI (dummy): You asked: "${prompt}". This is a placeholder response. Replace with real AI integration.`,
      });
    }
    const response = await axios.post(
      COHERE_API_URL,
      {
        message: prompt,
        model: "command-r-plus", // You can change to another Cohere model if needed
      },
      {
        headers: {
          Authorization: `Bearer ${COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const aiResponse = response.data?.text || response.data?.response || "";
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Cohere API error:", error?.response?.data || error);
    res.status(500).json({ error: error.message });
  }
};

const getImpactScore = async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea) {
      return res.status(400).json({ error: "Idea data is required." });
    }
    if (!COHERE_API_KEY) {
      return res.status(500).json({ error: "AI API key not configured." });
    }
    const response = await axios.post(
      COHERE_API_URL,
      {
        message: `Rate the impact of this idea on a scale of 1 to 100 and explain your reasoning. Idea: ${idea}`,
        model: "command-r-plus", // You can change to another Cohere model if needed
      },
      {
        headers: {
          Authorization: `Bearer ${COHERE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const aiResponse = response.data?.text || response.data?.response || "";
    res.json({ impactScore: aiResponse });
  } catch (error) {
    console.error("Cohere API error:", error?.response?.data || error);
    res.status(500).json({ error: error.message });
  }
};

export default { chat, getImpactScore };
