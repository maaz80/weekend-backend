import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      trim: true
    },
    company: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    salary: {
      type: mongoose.Schema.Types.Mixed
    },
    description: {
      type: String
    },
    url: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      default: "Make.com"
    }
  },
  {
    timestamps: true,
    strict: false // Allows saving any additional metadata sent in the Make.com payload
  }
);

const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);

export default Job;
