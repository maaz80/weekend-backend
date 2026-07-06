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

     role: {
          type: String,
          required: true
     }

}, { timestamps: true });

const Testimonial = mongoose.models.Testimonial || mongoose.model("Testimonial", testimonialSchema);

export default Testimonial;