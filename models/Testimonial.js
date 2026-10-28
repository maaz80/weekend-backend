import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema({

     quote: {
          type: String,
          required: true
     },

     name: {
          type: String,
          required: true
     },

     avatar: {
          type: String,
          default: ""
     }

}, { timestamps: true });

const Testimonial = mongoose.models.Testimonial || mongoose.model("Testimonial", testimonialSchema);

export default Testimonial;