import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
     title: String,
     leftsection: {
          image: String,
          inquiries: {
               title: String,
               email: String,
               phone: String
          },
          location: {
               title: String,
               address: String
          },
          social: {
               title: String,
               platform: [{
                    label: String,
                    url: String
               }]
          }
     },
     mapimage:String,
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     }

}, { timestamps: true });

const Contact = mongoose.models.Contact || mongoose.model("Contact", contactSchema);

export default Contact;
