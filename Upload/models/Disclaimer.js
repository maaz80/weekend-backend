import mongoose from "mongoose";

const disclaimerSchema = new mongoose.Schema({
     title:String,
    content:String,
     relatedBlogs: {
          title: String,
          startheading: String,
          midheading: String,
          endheading: String,
          description: String
     }

}, { timestamps: true });

const Disclaimer = mongoose.models.Disclaimer || mongoose.model("Disclaimer", disclaimerSchema);

export default Disclaimer;
