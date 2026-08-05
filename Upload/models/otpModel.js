import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
     phone: {
          type: String,
          index: true
     },
     email: {
          type: String,
          required: true
     },
     otp: {
          type: String,
          required: true
     },
     createdAt: {
          type: Date,
          default: Date.now,
          expires: 600 // Auto delete after 10 minutes
     },
     attempts: {
          type: Number,
          default: 0
     },
     isVerified: {
          type: Boolean,
          default: false
     }
});

export default mongoose.models.OTP || mongoose.model("OTP", otpSchema);