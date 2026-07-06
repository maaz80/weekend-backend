import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
     {
          name: {
               type: String,
               required: [true, "Please provide a name"],
               trim: true,
               maxlength: [100, "Name cannot be more than 100 characters"],
          },
          email: {
               type: String,
               required: [true, "Please provide an email"],
               unique: true,
               lowercase: true,
               match: [
                    /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                    "Please provide a valid email address",
               ],
          },
          password: {
               type: String,
               required: [true, "Please provide a password"],
               minlength: [6, "Password must be at least 6 characters"],
               select: false, // Don't return password by default
          },
          enrolledCourses: [
               {
                    courseId: {
                         type: mongoose.Schema.Types.ObjectId,
                         ref: "Courses"
                    },
                    enrolledAt: {
                         type: Date,
                         default: Date.now,
                    },
                    progress: {
                         type: Number,
                         default: 0,
                    },
                    completedLessons: [mongoose.Schema.Types.ObjectId],
               },
          ],
          createdAt: {
               type: Date,
               default: Date.now,
          },
          resetPasswordOTP: {
               type: String,
               select: false,
          },
          resetPasswordOTPExpires: {
               type: Date,
               select: false,
          },
     },
     {
          timestamps: true,
     }
);

// Hash password before saving
userSchema.pre("save", async function () {
     if (!this.isModified("password")) {
          return;
     }

     const salt = await bcrypt.genSalt(10);
     this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
     return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model("User", userSchema);
