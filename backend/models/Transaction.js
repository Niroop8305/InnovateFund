import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    idea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Idea",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "INR",
    },
    provider: {
      type: String,
      enum: ["razorpay"],
      default: "razorpay",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed", "refund_pending", "refunded"],
      default: "created",
    },
    orderId: {
      type: String,
      index: true,
    },
    paymentId: {
      type: String,
      index: true,
    },
    signature: {
      type: String,
    },
    refundId: {
      type: String,
    },
    failureReason: {
      type: String,
      default: "",
    },
    investmentApplied: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ idea: 1, createdAt: -1 });

export default mongoose.model("Transaction", transactionSchema);
