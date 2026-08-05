import jwt from "jsonwebtoken";
import User from "../models/Auth.js";
import connectDB from "../config/db.js";

export const protectUser = async (req, res, next) => {
     try {
          await connectDB();
          const authHeader = req.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
               return res.status(401).json({ error: "Not authorized, no token" });
          }

          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

          req.user = await User.findById(decoded.id);
          if (!req.user) {
               return res.status(404).json({ error: "User not found" });
          }

          next();
     } catch (error) {
          console.error("User auth error:", error);
          return res.status(401).json({ error: "Not authorized, token failed" });
     }
};
