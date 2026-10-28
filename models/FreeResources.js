import mongoose from "mongoose";

const freeResourcesSchema = new mongoose.Schema({
     hero: {
          subheading: String,
          heading: String,
          buttonText: String
     },
     featuredResources: {
          eyebrow: String,
          headingStart: String,
          headingHighlight: String,
          description: String,
          courseSlugs: [String],
          promoTitle: String,
          promoDescription: String,
          promoButtonText: String,
          promoButtonLink: String
     },
     popularTutorials: {
          headingStart: String,
          headingHighlight: String,
          tutorials: [{
               title: String,
               image: String,
               link: String
          }]
     }
}, { timestamps: true });

const FreeResources = mongoose.models.FreeResources ||
     mongoose.model("FreeResources", freeResourcesSchema);

export default FreeResources;
