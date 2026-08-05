import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
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

const Policy = mongoose.models.Policy || mongoose.model("Policy", policySchema);

export default Policy;
