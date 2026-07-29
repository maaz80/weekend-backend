import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
     name: {
          type: String,
          required: true
     },
     email: {
          type: String,
          required: true
     }
}, { timestamps: true });

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
