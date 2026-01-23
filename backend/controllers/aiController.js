import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;

// List of fallback models to try if primary model is rate-limited
// Ordered by reliability and speed - Updated with more available free models
const AI_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemini-flash-1.5-8b:free",
  "mistralai/mistral-7b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2-7b-instruct:free",
];

// Helper function to try multiple models with fallback
async function tryMultipleModels(messages, modelList = AI_MODELS) {
  let lastError = null;

  // Try first 3 models to increase success rate
  const modelsToTry = modelList.slice(0, 3);

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        OPENROUTER_API_URL,
        {
          model,
          messages,
          max_tokens: 1000, // Limit response length for faster replies
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://innovate-fund.vercel.app", // Optional but recommended
            "X-Title": "InnovateFund AI Assistant", // Optional but recommended
          },
          timeout: 45000, // 45 seconds for AI processing
        }
      );

      const aiMessage =
        response.data.choices?.[0]?.message?.content ||
        response.data.choices?.[0]?.text ||
        "";

      if (aiMessage) {
        console.log(`Successfully used model: ${model}`);
        return aiMessage;
      }
    } catch (error) {
      const errorMsg = error?.response?.data?.error?.message || error.message;
      console.log(`Model ${model} failed:`, errorMsg);
      lastError = error;

      // If it's a rate limit error (429), try next model immediately
      if (error?.response?.status === 429 || error?.response?.data?.error?.code === 429) {
        continue;
      }

      // For "no endpoints" or "provider error", skip to next model quickly
      if (errorMsg.includes("No endpoints") || errorMsg.includes("Provider returned error") || errorMsg.includes("rate-limited")) {
        continue;
      }

      // For other errors, also try next model
      continue;
    }
  }

  // If all models failed, throw the last error
  throw lastError || new Error("All AI models failed to respond");
}

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

    const aiMessage = await tryMultipleModels(messages);
    res.json({ response: aiMessage });
  } catch (error) {
    console.error("OpenRouter API error:", error?.response?.data || error);
    
    // Provide user-friendly error messages
    let errorMessage = "I apologize, but I'm temporarily unavailable. Please try again in a moment.";
    
    if (error?.response?.status === 401 || error?.response?.data?.error?.code === 401) {
      errorMessage = "AI service configuration error. Please contact support.";
      console.error("CRITICAL: Invalid OpenRouter API key. Please update OPENROUTER_API_KEY in environment variables.");
    } else if (error?.response?.status === 429 || error?.response?.data?.error?.code === 429) {
      errorMessage = "I'm experiencing high demand right now. Please wait a moment and try again.";
    } else if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      errorMessage = "The request took too long. Please try again with a shorter message.";
    }
    
    res.status(error?.response?.status || 500).json({ 
      error: errorMessage,
      details: error?.response?.data?.error?.message || error.message 
    });
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

    const aiMessage = await tryMultipleModels(messages);
    res.json({ impactScore: aiMessage });
  } catch (error) {
    console.error("OpenRouter API error:", error?.response?.data || error);
    
    let errorMessage = "Unable to calculate impact score. Please try again.";
    if (error?.response?.status === 429 || error?.response?.data?.error?.code === 429) {
      errorMessage = "Service is busy. Please try again in a moment.";
    }
    
    res.status(error?.response?.status || 500).json({ 
      error: errorMessage,
      details: error?.response?.data?.error?.message || error.message 
    });
  }
};

// For compatibility, export openrouterChat as chat
export const chat = openrouterChat;

export default { chat, getImpactScore, openrouterChat };
