import Joi from "joi";

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));

      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }

    next();
  };
};

export const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(6).max(128).required(),
    userType: Joi.string().valid("innovator", "investor").required(),
    company: Joi.string().max(100).trim().optional().allow(""),
    bio: Joi.string().max(500).trim().optional().allow(""),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  createIdea: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(20).max(2000).required(),
    category: Joi.string()
      .valid(
        "technology",
        "healthcare",
        "finance",
        "education",
        "environment",
        "social",
        "consumer",
        "enterprise",
      )
      .required(),
    stage: Joi.string()
      .valid("idea", "prototype", "mvp", "beta", "launched")
      .required(),
    fundingGoal: Joi.number().min(1000).required(),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  }),

  addComment: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
  }),

  sendMessage: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
    messageType: Joi.string().valid("text", "file", "image").default("text"),
  }),

  makeInvestment: Joi.object({
    amount: Joi.number().min(100).max(10000000).required(),
    message: Joi.string().max(500).trim().optional().allow(""),
  }),

  createPaymentOrder: Joi.object({
    ideaId: Joi.string().required(),
    amount: Joi.number().min(100).max(10000000).required(),
    terms: Joi.string().max(500).trim().optional().allow(""),
  }),

  verifyPayment: Joi.object({
    transactionId: Joi.string().required(),
    orderId: Joi.string().required(),
    paymentId: Joi.string().required(),
    signature: Joi.string().required(),
    terms: Joi.string().max(500).trim().optional().allow(""),
  }),

  refundPayment: Joi.object({
    transactionId: Joi.string().required(),
    amount: Joi.number().min(1).optional(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    bio: Joi.string().max(500).trim().optional().allow(""),
    location: Joi.string().max(100).trim().optional().allow(""),
    company: Joi.string().max(100).trim().optional().allow(""),
    website: Joi.string().uri().optional().allow(""),
    linkedinProfile: Joi.string().uri().optional().allow(""),
    expertise: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    sectorsOfInterest: Joi.array().items(Joi.string()).max(10).optional(),
    notificationsEnabled: Joi.boolean().optional(),
  }),
};
