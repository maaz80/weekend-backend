import mongoose from "mongoose";

const pageSEOSchema = new mongoose.Schema({
     pageSlug: {
          type: String,
          required: true,
          unique: true
     },
     title: {
          type: String,
          trim: true
     },
     description: {
          type: String,
          trim: true
     }
}, { timestamps: true });

const PageSEO = mongoose.models.PageSEO || mongoose.model("PageSEO", pageSEOSchema);
export default PageSEO;