import mongoose from "mongoose";

const brochureSchema = new mongoose.Schema(
     {
          title: {
               type: String,
               default: "Weekend UX Official Brochure"
          },
          pdfUrl: {
               type: String,
               required: true
          },
          fileName: {
               type: String,
               default: "Weekend-UX-Brochure.pdf"
          },
          fileSize: {
               type: Number,
               default: 0
          },
          mimeType: {
               type: String,
               default: "application/pdf"
          },
          uploadedBy: {
               type: String,
               default: "Admin"
          }
     },
     {
          timestamps: true
     }
);

const Brochure = mongoose.models.Brochure || mongoose.model("Brochure", brochureSchema);

export default Brochure;
