import mongoose from "mongoose";

const homeSchema = new mongoose.Schema({
     hero: {
          type: [{
               title: String,
               startheading: String,
               midheading: String,
               endheading: String,
               description: String,
               buttonName: String,
               bgImage: String
          }],
          default: []
     },
     features: {
          description: String,
          points: {
               type: [{
                    icon: String,
                    text: String
               }],
               default: []
          }
     },
     course: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String,
     },
     why: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          card: {
               type: [{
                    value: String,
                    valueName: String,
                    description: String
               }],
               default: []
          }
     },
     philosophy: {
          title: String,
          description: String
     },
     testimonials: {
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     },
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     }
}, { timestamps: true });

const Home = mongoose.models.Home || mongoose.model("Home", homeSchema);

export default Home;
