import mongoose from "mongoose";

const locationItemSchema = new mongoose.Schema({
     hero: [{
          title: String,
          seotitle: String,
          seodescription: String,
          slug: String,
          heading: String,
          buttonName: String
     }],
     content: String,
     image: {
          imageurl: String,
          alt: String,
     },
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     },
     faq: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String,
          items: [{
               ques: String,
               ans: String
          }]
     }
});

const locationSchema = new mongoose.Schema({
     title: String,
     items: [locationItemSchema]
}, { timestamps: true });

export default mongoose.models.Location || mongoose.model("Location", locationSchema);
