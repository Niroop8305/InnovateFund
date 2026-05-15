import express from "express";
import User from "../models/User.js";
import Idea from "../models/Idea.js";
import Transaction from "../models/Transaction.js";
import { requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(requireRole(["admin"]));

const buildMonthSeries = (startDate, dataMap) => {
  const series = [];
  const cursor = new Date(startDate);
  for (let i = 0; i < 6; i += 1) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    series.push({
      month: key,
      value: dataMap.get(key) || 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
};

router.get("/users", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      userType,
      verified,
      banned,
    } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }
    if (userType) {
      filter.userType = userType;
    }
    if (verified !== undefined) {
      filter.isVerified = verified === "true";
    }
    if (banned !== undefined) {
      filter.isBanned = banned === "true";
    }

    const users = await User.find(filter)
      .select("-password -fcmToken")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/users/:id/ban", async (req, res) => {
  try {
    const { banned } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: !!banned },
      { new: true },
    ).select("-password -fcmToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated", user });
  } catch (error) {
    console.error("Admin ban error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/users/:id/verify", async (req, res) => {
  try {
    const { isVerified } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: !!isVerified },
      { new: true },
    ).select("-password -fcmToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated", user });
  } catch (error) {
    console.error("Admin verify error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/ideas", async (req, res) => {
  try {
    const { page = 1, limit = 20, status = "pending", search } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const ideas = await Idea.find(filter)
      .populate("creator", "name profilePicture company")
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Idea.countDocuments(filter);

    res.json({
      ideas,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Admin ideas error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/ideas/:id/approve", async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    idea.status = "published";
    idea.rejectionReason = "";
    idea.approvedAt = new Date();
    idea.rejectedAt = null;
    await idea.save();

    await idea.populate("creator", "name profilePicture company");

    res.json({ message: "Idea approved", idea });
  } catch (error) {
    console.error("Admin approve error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/ideas/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    idea.status = "rejected";
    idea.rejectionReason = reason || "";
    idea.rejectedAt = new Date();
    await idea.save();

    await idea.populate("creator", "name profilePicture company");

    res.json({ message: "Idea rejected", idea });
  } catch (error) {
    console.error("Admin reject error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/metrics", async (req, res) => {
  try {
    const now = new Date();
    const activeSince = new Date(now);
    activeSince.setDate(activeSince.getDate() - 30);

    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      verifiedUsers,
      totalIdeas,
      pendingIdeas,
      publishedIdeas,
      totalFundingAgg,
      topProjects,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        lastActive: { $gte: activeSince },
        isBanned: false,
      }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isVerified: true }),
      Idea.countDocuments(),
      Idea.countDocuments({ status: "pending" }),
      Idea.countDocuments({ status: "published" }),
      Transaction.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Idea.find({ status: "published" })
        .sort({ currentFunding: -1 })
        .limit(5)
        .select("title currentFunding fundingGoal creator")
        .populate("creator", "name"),
    ]);

    const totalFunding = totalFundingAgg?.[0]?.total || 0;

    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const fundingSeriesAgg = await Transaction.aggregate([
      { $match: { status: "paid", createdAt: { $gte: startMonth } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const fundingMap = new Map(
      fundingSeriesAgg.map((item) => {
        const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
        return [key, item.total];
      }),
    );

    const userSeriesAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startMonth } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const userMap = new Map(
      userSeriesAgg.map((item) => {
        const key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
        return [key, item.total];
      }),
    );

    res.json({
      totals: {
        totalUsers,
        activeUsers,
        bannedUsers,
        verifiedUsers,
        totalIdeas,
        pendingIdeas,
        publishedIdeas,
        totalFunding,
      },
      topProjects,
      charts: {
        fundingByMonth: buildMonthSeries(startMonth, fundingMap),
        usersByMonth: buildMonthSeries(startMonth, userMap),
      },
    });
  } catch (error) {
    console.error("Admin metrics error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
