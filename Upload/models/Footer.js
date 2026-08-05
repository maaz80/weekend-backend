import mongoose from "mongoose";

const footerSchema = new mongoose.Schema({
     title: {
          type: String,
          required: false
     },
     links: [{
          label: {
               type: String,
          },
          path: {
               type: String,
          }
     }],
     order: {
          type: Number,
          default: 0
     },
     navigation: [{
          itemname: {
               type: String
          },
          itempath: {
               type: String
          }
     }],
     card:{
          title:String,
          buttonName:String
     },
     socials: [{
          icon: {
               type: String
          },
          path: {
               type: String
          }
     }],
     buttonname: {
          type: String
     },
     buttontitle: {
          type: String
     },
     copyright: {
          type: String
     },
     isGlobal: {
          type: Boolean,
          default: false
     }
}, { timestamps: true });

const Footer = mongoose.models.Footer || mongoose.model("Footer", footerSchema);

export default Footer;
