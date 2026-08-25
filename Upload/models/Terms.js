import mongoose from "mongoose";

const termsSchema = new mongoose.Schema({
     title: String,
     content: String,
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     }

}, { timestamps: true });

const Terms = mongoose.models.Terms || mongoose.model("Terms", termsSchema);

export default Terms;
