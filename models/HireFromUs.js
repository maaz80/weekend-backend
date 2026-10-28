import mongoose from "mongoose";

const hireFromUsSchema = new mongoose.Schema({
     hero: {
          eyebrow: String,
          heading: String,
          buttonText: String,
          intro: String,
          benefits: [String]
     },
     candidateSearch: {
          eyebrow: String,
          headingStart: String,
          headingHighlight: String,
          headingEnd: String,
          roles: [String],
          resultMessage: String
     },
     recruiterBenefits: {
          headingStart: String,
          headingHighlight: String,
          description: String,
          benefits: [{
               title: String,
               description: String
          }]
     },
     hiringStats: {
          eyebrow: String,
          headingStart: String,
          headingHighlight: String,
          headingEnd: String,
          chartTitle: String,
          experience: [{
               label: String,
               value: Number
          }]
     },
     candidatePools: {
          eyebrow: String,
          headingStart: String,
          headingHighlight: String,
          headingEnd: String,
          actionLabel: String,
          actionHref: String,
          pools: [{
               value: String,
               valueName: String,
               description: String
          }]
     }
}, { timestamps: true });

const HireFromUs = mongoose.models.HireFromUs ||
     mongoose.model("HireFromUs", hireFromUsSchema);

export default HireFromUs;
