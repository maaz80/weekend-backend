import User from "../models/Auth.js";
import connectDB from "../config/db.js";

const profileQuery = {
     profileCompleted: true,
     profileSubmittedAt: { $ne: null },
};

export const getUserInformation = async (req, res) => {
     try {
          await connectDB();
          const profiles = await User.find(profileQuery)
               .select("name email phone profileDetails profileSubmittedAt profileReviewedAt createdAt")
               .sort({ profileSubmittedAt: -1 })
               .lean();

          return res.json({ success: true, profiles });
     } catch (error) {
          console.error("CRM user information load error:", error);
          return res.status(500).json({ error: "Failed to load user information." });
     }
};

export const getNewUserInformationCount = async (req, res) => {
     try {
          await connectDB();
          const newCount = await User.countDocuments({
               ...profileQuery,
               profileReviewedAt: null,
          });

          return res.json({ success: true, newCount });
     } catch (error) {
          console.error("CRM new user information count error:", error);
          return res.status(500).json({ error: "Failed to load new user count." });
     }
};

export const markUserInformationReviewed = async (req, res) => {
     try {
          await connectDB();
          if (!/^[a-f\d]{24}$/i.test(req.params.userId)) {
               return res.status(400).json({ error: "Invalid user ID." });
          }

          const user = await User.findOneAndUpdate(
               { _id: req.params.userId, ...profileQuery },
               { $set: { profileReviewedAt: new Date() } },
               { new: true }
          ).select("_id profileReviewedAt");

          if (!user) {
               return res.status(404).json({ error: "Submitted user information not found." });
          }

          return res.json({ success: true, profileReviewedAt: user.profileReviewedAt });
     } catch (error) {
          console.error("CRM user information review error:", error);
          return res.status(500).json({ error: "Failed to update review status." });
     }
};
