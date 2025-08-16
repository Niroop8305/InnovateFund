import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;

// General OpenRouter AI chat endpoint (for /ai/chat and /ai/openrouter-chat)
export const openrouterChat = async (req, res) => {
  try {
    let messages = req.body.messages;
    // Support legacy prompt/message for compatibility
    if (!messages && (req.body.prompt || req.body.message)) {
      messages = [
        { role: "user", content: req.body.prompt || req.body.message },
      ];
    }
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "nousresearch/deephermes-3-llama-3-8b-preview:free",
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    // Always return a consistent object with a 'response' property for frontend
    const aiMessage =
      response.data.choices?.[0]?.message?.content ||
      response.data.choices?.[0]?.text ||
      "";
    res.json({ response: aiMessage });
  } catch (error) {
    console.error("OpenRouter API error:", error?.response?.data || error);
    res.status(500).json({ error: error.message });
  }
};

// Impact score using OpenRouter
export const getImpactScore = async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea) {
      return res.status(400).json({ error: "Idea data is required." });
    }
    const messages = [
      {
        role: "user",
        content: `Rate the impact of this idea on a scale of 1 to 100 and explain your reasoning. Idea: ${idea}`,
      },
    ];
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "nousresearch/deephermes-3-llama-3-8b-preview:free",
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    res.json({
      impactScore: response.data.choices?.[0]?.message?.content || "",
    });
  } catch (error) {
    console.error("OpenRouter API error:", error?.response?.data || error);
    res.status(500).json({ error: error.message });
  }
};

// For compatibility, export openrouterChat as chat
export const chat = openrouterChat;

export default { chat, getImpactScore, openrouterChat };
