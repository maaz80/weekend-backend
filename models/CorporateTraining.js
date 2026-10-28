import mongoose from "mongoose";

const corporateTrainingSchema = new mongoose.Schema({
     hero: {
          eyebrow: String,
          heading: String,
          buttonText: String,
          buttonLink: String,
          backgroundImage: String
     },
     trustedBy: {
          startheading: String,
          midheading: String,
          endheading: String,
          description: String,
          backgroundImage: String,
          partners: [{
               name: String,
               image: String,
               alt: String
          }]
     },
     whyUs: {
          eyebrow: String,
          headingStart: String,
          headingHighlight: String,
          headingEnd: String,
          description: String,
          backgroundImage: String,
          cardImageOne: String,
          cardImageTwo: String,
          points: [String]
     },
     trainingOptions: {
          eyebrow: String,
          headingStart: String,
          headingHighlight: String,
          headingEnd: String,
          backgroundImage: String,
          showcaseBackgroundImage: String,
          options: [{
               id: String,
               title: String,
               image: String,
               topics: [String]
          }]
     },
     outcomes: {
          headingStart: String,
          headingHighlight: String,
          headingEnd: String,
          cards: [{
               icon: String,
               value: String,
               label: String
          }]
     },
     talkToExpert: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          formTitle: String,
          buttonLabel: String
     }
}, { timestamps: true });

const CorporateTraining = mongoose.models.CorporateTraining ||
     mongoose.model("CorporateTraining", corporateTrainingSchema);

export default CorporateTraining;
