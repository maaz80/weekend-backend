import jwt from "jsonwebtoken";
import User from "../models/Auth.js";
import { transporter } from "../config/mailer.js";
import { NextResponse } from "next/server";
import connectDB from "../config/db.js";
import OTP from "../models/otpModel.js";

const generateToken = (id) => {
     return jwt.sign({ id }, process.env.JWT_SECRET || "your-secret-key", {
          expiresIn: "7d",
     });
};

export const signup = async (req) => {
     try {
          await connectDB();
          const { name, email, otp } = await req.json();

          // Validation
          if (!name || !email || !otp) {
               return NextResponse.json({ error: "Please provide name, email, and OTP" }, { status: 400 });
          }

          // Check if OTP is valid
          const otpRecord = await OTP.findOne({ email });
          if (!otpRecord) {
               return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
          }
          if (otpRecord.otp !== otp) {
               return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
          }

          // Check if user exists
          const userExists = await User.findOne({ email });
          if (userExists) {
               return NextResponse.json({ error: "User already registered. Please login instead." }, { status: 400 });
          }

          // Create user with a random password to satisfy schema validation
          const randomPassword = Math.random().toString(36).substring(2, 12) + "A1!";
          const user = await User.create({
               name,
               email,
               password: randomPassword,
          });

          // Delete OTP record
          await OTP.deleteOne({ email });

          // Generate token
          const token = generateToken(user._id);

          return NextResponse.json({
               success: true,
               token,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
               },
          }, { status: 201 });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const login = async (req) => {
     try {
          await connectDB();
          const { email, otp } = await req.json();

          // Validation
          if (!email || !otp) {
               return NextResponse.json({ error: "Please provide email and OTP" }, { status: 400 });
          }

          // Check if OTP is valid
          const otpRecord = await OTP.findOne({ email });
          if (!otpRecord) {
               return NextResponse.json({ error: "No OTP found. Please request a new one." }, { status: 400 });
          }
          if (otpRecord.otp !== otp) {
               return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
          }

          // Check if user exists
          const user = await User.findOne({ email });
          if (!user) {
               return NextResponse.json({ error: "User not found. Please sign up first." }, { status: 404 });
          }

          // Delete OTP record
          await OTP.deleteOne({ email });

          // Generate token
          const token = generateToken(user._id);

          return NextResponse.json({
               success: true,
               token,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
               },
          });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const getMe = async (req) => {
     try {
          await connectDB();
          const authHeader = req.headers.get("authorization");
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
               return NextResponse.json({ error: "Not authorized, no token" }, { status: 401 });
          }

          const token = authHeader.split(" ")[1];
          let decoded;
          try {
               decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
          } catch (jwtErr) {
               return NextResponse.json({ error: "Not authorized, token failed" }, { status: 401 });
          }

          const user = await User.findById(decoded.id).populate('enrolledCourses.courseId');

          if (!user) {
               return NextResponse.json({ error: "User not found" }, { status: 404 });
          }

          return NextResponse.json({
               success: true,
               user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    enrolledCourses: user.enrolledCourses,
               },
          });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const logout = async (req) => {
     return NextResponse.json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req) => {
     try {
          await connectDB();
          const { email } = await req.json();

          if (!email) {
               return NextResponse.json({ error: "Please provide email" }, { status: 400 });
          }

          const user = await User.findOne({ email });
          if (!user) {
               return NextResponse.json({ error: "User with this email does not exist" }, { status: 404 });
          }

          // Generate 6-digit OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();

          user.resetPasswordOTP = otp;
          user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

          await user.save();

          // Send Email
          await transporter.sendMail({
               from: process.env.EMAIL_FROM || '"Weekend UX" <no-reply@weekendux.com>',
               to: email,
               subject: "Password Reset OTP - Weekend UX",
               html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
                         <h2 style="color: #f97316; text-align: center;">Weejebd UX Password Reset</h2>
                         <p>Hello ${user.name},</p>
                         <p>You requested to reset your password. Use the following 6-digit OTP to reset it:</p>
                         <div style="text-align: center; margin: 30px 0;">
                              <span style="color: #f97316; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 10px 20px; background: #fff7ed; border: 1.5px dashed #f97316; border-radius: 8px; display: inline-block;">${otp}</span>
                         </div>
                         <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
                    </div>
               `
          });

          return NextResponse.json({ success: true, message: "OTP sent to your email" });
     } catch (error) {
          console.error("Forgot password error:", error);
          return NextResponse.json({ error: error.message || "Failed to send OTP" }, { status: 500 });
     }
};

export const resetPassword = async (req) => {
     try {
          await connectDB();
          const { email, otp, newPassword } = await req.json();

          if (!email || !otp || !newPassword) {
               return NextResponse.json({ error: "Please provide all fields" }, { status: 400 });
          }

          if (newPassword.length < 6) {
               return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
          }

          // Find user with matching OTP and valid expiration
          const user = await User.findOne({
               email,
               resetPasswordOTP: otp,
               resetPasswordOTPExpires: { $gt: Date.now() }
          }).select("+resetPasswordOTP +resetPasswordOTPExpires +password");

          if (!user) {
               return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
          }

          // Update password and clear OTP
          user.password = newPassword;
          user.resetPasswordOTP = undefined;
          user.resetPasswordOTPExpires = undefined;

          await user.save();

          return NextResponse.json({ success: true, message: "Password reset successfully" });
     } catch (error) {
          console.error("Reset password error:", error);
          return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
     }
};

export const sendAuthOTP = async (req) => {
     try {
          await connectDB();
          const { email } = await req.json();

          if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
               return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
          }

          // Generate 6-digit OTP
          const otp = Math.floor(100000 + Math.random() * 900000).toString();

          // Store OTP in database
          await OTP.findOneAndUpdate(
               { email },
               { otp, email, attempts: 0, isVerified: false, createdAt: new Date() },
               { upsert: true, new: true }
          );

          // Send OTP via Email
          await transporter.sendMail({
               from: process.env.EMAIL_FROM,
               to: email,
               subject: "Your OTP Verification Code - Weekend UX",
               html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                         <h2 style="color: #FFD400; text-align: center;">Weekend UX Verification</h2>
                         <p style="font-size: 16px; color: #333;">Hello,</p>
                         <p style="font-size: 16px; color: #333;">Your verification OTP code for login/signup is:</p>
                         <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                              ${otp}
                         </div>
                         <p style="font-size: 14px; color: #666;">This OTP is valid for 10 minutes.</p>
                         <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
                         <hr style="margin: 20px 0;" />
                         <p style="font-size: 12px; color: #999; text-align: center;">© Weekend UX - Intelligent Design Solutions</p>
                    </div>
               `
          });

          return NextResponse.json({ success: true, message: "OTP sent to your email" });
     } catch (error) {
          console.error("Send auth OTP error:", error);
          return NextResponse.json({ error: error.message || "Failed to send OTP" }, { status: 500 });
     }
};
