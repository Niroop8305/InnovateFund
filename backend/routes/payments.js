import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";

import Idea from "../models/Idea.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { validateRequest, schemas } from "../middleware/validation.js";

const router = express.Router();

const razorpay =
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
    : null;

const ensureRazorpay = (res) => {
  if (!razorpay) {
    res.status(503).json({
      message:
        "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    });
    return false;
  }
  return true;
};

const applyInvestment = async ({ transaction, idea, investorId, terms }) => {
  const alreadyInvested = idea.investments.some(
    (inv) => inv.investor.toString() === investorId.toString(),
  );

  if (alreadyInvested) {
    transaction.investmentApplied = true;
    await transaction.save();
    return { applied: false, reason: "already_invested" };
  }

  idea.investments.push({
    investor: investorId,
    amount: transaction.amount,
    terms: terms || "",
    investedAt: new Date(),
  });

  idea.currentFunding += transaction.amount;
  await idea.save();

  await User.findByIdAndUpdate(investorId, {
    $inc: { totalInvestments: 1, reputationScore: 2 },
  });

  transaction.investmentApplied = true;
  await transaction.save();

  const { sendNotification } =
    await import("../controllers/notificationController.js");
  await sendNotification({
    recipient: idea.creator,
    sender: investorId,
    type: "new_investment",
    title: "New Investment Received!",
    message: `${transaction.amount.toLocaleString("en-IN")} INR invested in your idea "${idea.title}"`,
    relatedItem: {
      itemType: "idea",
      itemId: idea._id,
    },
    actionUrl: `/ideas/${idea._id}`,
  });

  return { applied: true };
};

// Razorpay webhook handler (no auth)
router.post("/razorpay/webhook", async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(503).json({ message: "Webhook secret not configured" });
    }

    const rawBody = req.rawBody ? req.rawBody.toString("utf8") : "";
    const signature = req.headers["x-razorpay-signature"];

    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (!signature || signature !== expected) {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(rawBody);
    const payload = event?.payload?.payment?.entity;
    const orderId = payload?.order_id;
    const paymentId = payload?.id;

    if (!orderId && !paymentId) {
      return res.json({ received: true });
    }

    const transaction = await Transaction.findOne({
      $or: [{ orderId }, { paymentId }],
    });

    if (!transaction) {
      return res.json({ received: true });
    }

    if (event.event === "payment.captured") {
      if (transaction.status !== "paid") {
        transaction.status = "paid";
        transaction.paymentId = paymentId || transaction.paymentId;
        await transaction.save();
      }

      if (!transaction.investmentApplied) {
        const idea = await Idea.findById(transaction.idea);
        if (idea) {
          await applyInvestment({
            transaction,
            idea,
            investorId: transaction.user,
            terms: transaction.metadata?.terms,
          });
        }
      }
    }

    if (event.event === "payment.failed") {
      transaction.status = "failed";
      transaction.failureReason =
        payload?.error_description || "Payment failed";
      transaction.paymentId = paymentId || transaction.paymentId;
      await transaction.save();
    }

    if (event.event?.startsWith("refund.")) {
      transaction.status = "refunded";
      transaction.refundId = event?.payload?.refund?.entity?.id || "";
      await transaction.save();
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Authenticated routes below
router.use(authMiddleware);

// Create Razorpay order
router.post(
  "/razorpay/order",
  requireRole(["investor"]),
  validateRequest(schemas.createPaymentOrder),
  async (req, res) => {
    try {
      if (!ensureRazorpay(res)) return;

      const { ideaId, amount, terms } = req.body;

      const idea = await Idea.findById(ideaId);
      if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
      }

      const alreadyInvested = idea.investments.some(
        (inv) => inv.investor.toString() === req.user._id.toString(),
      );
      if (alreadyInvested) {
        return res
          .status(400)
          .json({ message: "You have already invested in this idea" });
      }

      const order = await razorpay.orders.create({
        amount: Math.round(Number(amount) * 100),
        currency: "INR",
        receipt: `idea_${ideaId}_${Date.now()}`,
        notes: {
          ideaId,
          investorId: req.user._id.toString(),
        },
      });

      const transaction = await Transaction.create({
        user: req.user._id,
        idea: ideaId,
        amount: Number(amount),
        currency: "INR",
        provider: "razorpay",
        status: "created",
        orderId: order.id,
        metadata: {
          terms: terms || "",
        },
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        transactionId: transaction._id,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Verify Razorpay payment
router.post(
  "/razorpay/verify",
  requireRole(["investor"]),
  validateRequest(schemas.verifyPayment),
  async (req, res) => {
    try {
      if (!ensureRazorpay(res)) return;

      const { transactionId, orderId, paymentId, signature, terms } = req.body;

      const transaction = await Transaction.findById(transactionId);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      if (transaction.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (transaction.orderId !== orderId) {
        return res.status(400).json({ message: "Order mismatch" });
      }

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ message: "Invalid payment signature" });
      }

      if (transaction.status !== "paid") {
        transaction.status = "paid";
        transaction.paymentId = paymentId;
        transaction.signature = signature;
        if (terms) {
          transaction.metadata = { ...transaction.metadata, terms };
        }
        await transaction.save();
      }

      if (!transaction.investmentApplied) {
        const idea = await Idea.findById(transaction.idea);
        if (!idea) {
          return res.status(404).json({ message: "Idea not found" });
        }
        await applyInvestment({
          transaction,
          idea,
          investorId: req.user._id,
          terms: terms || transaction.metadata?.terms,
        });
      }

      res.json({ message: "Payment verified", transactionId });
    } catch (error) {
      console.error("Verify payment error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// Get transaction history
router.get("/transactions", requireRole(["investor"]), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ user: req.user._id })
      .populate("idea", "title")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ user: req.user._id });

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Basic refund endpoint
router.post(
  "/razorpay/refund",
  requireRole(["investor"]),
  validateRequest(schemas.refundPayment),
  async (req, res) => {
    try {
      if (!ensureRazorpay(res)) return;

      const { transactionId, amount } = req.body;
      const transaction = await Transaction.findById(transactionId);
      if (!transaction || !transaction.paymentId) {
        return res.status(404).json({ message: "Transaction not refundable" });
      }

      if (transaction.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (transaction.status !== "paid") {
        return res
          .status(400)
          .json({ message: "Only paid transactions can be refunded" });
      }

      const refund = await razorpay.payments.refund(transaction.paymentId, {
        amount: amount ? Math.round(Number(amount) * 100) : undefined,
      });

      transaction.status = "refund_pending";
      transaction.refundId = refund.id;
      await transaction.save();

      res.json({ message: "Refund initiated", refundId: refund.id });
    } catch (error) {
      console.error("Refund error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
);

export default router;
