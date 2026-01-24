import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;

// List of fallback models to try if primary model is rate-limited
// Using most reliable free models as of 2026
const AI_MODELS = [
  "google/gemini-flash-1.5:free",
  "google/gemini-pro-1.5:free",
  "meta-llama/llama-3.2-1b-instruct:free",
  "microsoft/phi-3-medium-128k-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  // Fallback to paid models if free ones fail (cost-effective)
  "meta-llama/llama-3.1-8b-instruct",
  "mistralai/mistral-7b-instruct",
];

// Helper function to try multiple models with fallback
async function tryMultipleModels(messages, modelList = AI_MODELS) {
  let lastError = null;

  // Try all free models first (first 6), then fallback to cheap paid models
  const modelsToTry = modelList;

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
        },
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
      const errorCode =
        error?.response?.status || error?.response?.data?.error?.code;
      console.log(`Model ${model} failed (${errorCode}):`, errorMsg);
      lastError = error;

      // If authentication error, don't try other models
      if (errorCode === 401 || errorCode === 403) {
        throw error;
      }

      // For all other errors (404, 429, 500, etc.), try next model
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
    let errorMessage =
      "I apologize, but I'm temporarily unavailable. All AI models are currently experiencing issues. Please try again in a few minutes.";
    let statusCode = 503;

    if (
      error?.response?.status === 401 ||
      error?.response?.data?.error?.code === 401
    ) {
      errorMessage = "AI service configuration error. Please contact support.";
      statusCode = 500;
      console.error(
        "CRITICAL: Invalid OpenRouter API key. Please update OPENROUTER_API_KEY in environment variables.",
      );
    } else if (
      error?.response?.status === 429 ||
      error?.response?.data?.error?.code === 429
    ) {
      errorMessage =
        "I'm experiencing high demand right now. Please wait a moment and try again.";
      statusCode = 429;
    } else if (
      error?.code === "ECONNABORTED" ||
      error?.message?.includes("timeout")
    ) {
      errorMessage =
        "The request took too long. Please try again with a shorter message.";
      statusCode = 504;
    } else if (
      error?.response?.data?.error?.message?.includes("No endpoints") ||
      error?.response?.data?.error?.code === 404
    ) {
      errorMessage =
        "AI service is temporarily unavailable. Our team has been notified. Please try again later.";
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development"
          ? error?.response?.data?.error?.message || error.message
          : undefined,
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
    let statusCode = 503;

    if (
      error?.response?.status === 429 ||
      error?.response?.data?.error?.code === 429
    ) {
      errorMessage = "Service is busy. Please try again in a moment.";
      statusCode = 429;
    } else if (
      error?.response?.data?.error?.message?.includes("No endpoints") ||
      error?.response?.data?.error?.code === 404
    ) {
      errorMessage =
        "AI service is temporarily unavailable. Please try again later.";
      statusCode = 503;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development"
          ? error?.response?.data?.error?.message || error.message
          : undefined,
    });
  }
};

// For compatibility, export openrouterChat as chat
export const chat = openrouterChat;

export default { chat, getImpactScore, openrouterChat };
