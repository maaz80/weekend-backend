import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
     name: {
          type: String,
          required: true
     },
     email: {
          type: String,
          required: true
     },
     phone: {
          type: String,
          default: ""
     },
     source: {
          type: String,
          default: "Website Lead"
     },
     answers: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
     }
}, { timestamps: true });

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
