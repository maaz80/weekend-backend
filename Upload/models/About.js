import mongoose from "mongoose";

const aboutSchema = new mongoose.Schema({
     hero: [{
          title: String,
          heading: String,
          buttonName: String,
          bgImage: String
     }],
     features: {
          description: String,
          points: [{
               icon: String,
               text: String
          }]
     },
     quote: String,
     why: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          card: [{
               value: String,
               valueName: String,
               description: String
          }]
     },
     team: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String,
          imageCard: [{
               image: String,
               name: String,
               role: String
          }]
     },
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     }

}, { timestamps: true });

const About = mongoose.models.About || mongoose.model("About", aboutSchema);

export default About;
