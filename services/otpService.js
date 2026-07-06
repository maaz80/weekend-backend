import otpGenerator from "otp-generator";
import OTP from "../models/otpModel.js";
import { transporter } from "../config/mailer.js";

export const generateAndSendOTP = async (phone, email) => {
     try {
          if (!email) {
               throw new Error("Email is required to send OTP");
          }

          // Generate 6-digit OTP
          const otp = otpGenerator.generate(6, {
               digits: true,
               lowerCaseAlphabets: false,
               upperCaseAlphabets: false,
               specialChars: false
          });

          // Store OTP in database
          await OTP.findOneAndUpdate(
               { phone },
               { otp, email, attempts: 0, isVerified: false, createdAt: new Date() },
               { upsert: true, new: true, returnDocument: 'after' }
          );

          // Send OTP via Email
          const mailOptions = {
               from: process.env.EMAIL_FROM,
               to: email,
               subject: "Your OTP for Weekend UX Booking",
               html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                         <h2 style="color: #FFB500; text-align: center;">Weekend UX Booking Verification</h2>
                         <p style="font-size: 16px; color: #333;">Hello,</p>
                         <p style="font-size: 16px; color: #333;">Your OTP for booking verification is:</p>
                         <div style="background-color: #f7f7f7; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                              ${otp}
                         </div>
                         <p style="font-size: 14px; color: #666;">This OTP is valid for 10 minutes.</p>
                         <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
                         <hr style="margin: 20px 0;" />
                         <p style="font-size: 12px; color: #999; text-align: center;">© Weekend UX - Intelligent Design Solutions</p>
                    </div>
               `
          };

          await transporter.sendMail(mailOptions);

          // console.log(`✅ OTP sent to ${email}: ${otp}`);

          return { success: true, message: "OTP sent to your email" };
     } catch (error) {
          console.error("Error sending OTP:", error);
          throw new Error("Failed to send OTP");
     }
};

export const verifyOTP = async (phone, otp) => {
     try {
          const otpRecord = await OTP.findOne({ phone });

          if (!otpRecord) {
               return { success: false, message: "No OTP found. Request a new one." };
          }

          if (otpRecord.isVerified) {
               return { success: false, message: "OTP already verified" };
          }

          if (otpRecord.attempts >= 3) {
               await OTP.deleteOne({ phone });
               return { success: false, message: "Too many failed attempts. Request a new OTP." };
          }

          if (otpRecord.otp !== otp) {
               otpRecord.attempts += 1;
               await otpRecord.save();
               return { success: false, message: `Invalid OTP. ${3 - otpRecord.attempts} attempts remaining.` };
          }

          otpRecord.isVerified = true;
          await otpRecord.save();

          return { success: true, message: "OTP verified successfully" };
     } catch (error) {
          console.error("Error verifying OTP:", error);
          throw new Error("Failed to verify OTP");
     }
};

export const isPhoneVerified = async (phone) => {
     const otpRecord = await OTP.findOne({ phone, isVerified: true });
     return !!otpRecord;
};