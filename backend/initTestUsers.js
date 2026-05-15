import User from "./models/User.js";

/**
 * Initialize test users if they don't exist
 * This runs automatically when the server starts
 */
export async function initTestUsers() {
  try {
    // Check if test users already exist
    const innovatorExists = await User.findOne({ email: "innovator@test.com" });
    const investorExists = await User.findOne({ email: "investor@test.com" });
    const adminExists = await User.findOne({ email: "admin@test.com" });

    // Create innovator if doesn't exist
    if (!innovatorExists) {
      const innovator = new User({
        name: "Alex Innovation",
        email: "innovator@test.com",
        password: "Test123!",
        userType: "innovator",
        isVerified: true,
        bio: "Serial entrepreneur with passion for disruptive technologies. Founded 3 startups, 2 successful exits. Always looking for the next big thing.",
        location: "San Francisco, CA",
        company: "TechVentures Inc",
        website: "https://alexinnovation.com",
        linkedinProfile: "https://linkedin.com/in/alexinnovation",
        expertise: ["technology", "product development", "AI/ML", "blockchain"],
        sectorsOfInterest: ["technology", "healthcare", "finance"],
        reputationScore: 85,
      });
      await innovator.save();
      console.log("✓ Test innovator account created: innovator@test.com");
    }

    // Create investor if doesn't exist
    if (!investorExists) {
      const investor = new User({
        name: "Morgan Capital",
        email: "investor@test.com",
        password: "Test123!",
        userType: "investor",
        isVerified: true,
        bio: "Venture capitalist focused on early-stage tech startups. INR 50Cr+ deployed across 30+ companies. Looking for high-impact innovations.",
        location: "New York, NY",
        company: "Morgan Capital Partners",
        website: "https://morgancapital.com",
        linkedinProfile: "https://linkedin.com/in/morgancapital",
        expertise: ["venture capital", "fintech", "SaaS", "market analysis"],
        investmentRange: {
          min: 50000,
          max: 2000000,
        },
        sectorsOfInterest: ["technology", "finance", "healthcare", "education"],
        reputationScore: 92,
      });
      await investor.save();
      console.log("✓ Test investor account created: investor@test.com");
    }

    // Create admin if doesn't exist
    if (!adminExists) {
      const admin = new User({
        name: "Admin",
        email: "admin@test.com",
        password: "Admin123!",
        userType: "admin",
        isVerified: true,
      });
      await admin.save();
      console.log("✓ Admin account created: admin@test.com");
    }

    if (innovatorExists && investorExists && adminExists) {
      console.log("✓ Test accounts already exist and ready to use");
    }
  } catch (error) {
    console.error("Error initializing test users:", error.message);
  }
}
