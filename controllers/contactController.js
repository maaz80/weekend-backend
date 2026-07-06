import Contact from "../models/Contact.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";

// GET CONTACT PAGE CONFIGURATION
export const getContact = async (req) => {
     try {
          await connectDB();
          let contact = await Contact.findOne();
          if (!contact) {
               contact = new Contact({
                    title: "Contact Us",
                    leftsection: {
                         image: "",
                         inquiries: {
                              title: "Inquiries",
                              email: "info@weekend.com",
                              phone: "+91 99999 99999"
                         },
                         location: {
                              title: "Our Office",
                              address: "123, Design Street, Creative City"
                         },
                         social: {
                              title: "Follow Us",
                              platform: [
                                   { label: "Facebook", url: "#" },
                                   { label: "Instagram", url: "#" },
                                   { label: "LinkedIn", url: "#" }
                              ]
                         }
                    },
                    mapimage: "",
                    relatedBlogs: {
                         title: "Related Blogs",
                         startheading: "Our",
                         midheading: "Latest",
                         endheading: "Articles",
                         description: "Stay updated with the latest trends and stories from our design blog."
                    }
               });
               await contact.save();
          }
          return NextResponse.json(contact);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE CONTACT PAGE CONFIGURATION
export const updateContact = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          
          let updateData = {};
          let leftSectionImageFile = null;
          let mapImageFile = null;

          if (contentType.includes("multipart/form-data")) {
               const formData = await req.formData();
               const dataStr = formData.get("data");
               updateData = dataStr ? JSON.parse(dataStr) : {};
               
               leftSectionImageFile = formData.get("leftSectionImage");
               mapImageFile = formData.get("mapImage");

               if (leftSectionImageFile) {
                    const url = await uploadToCloudinary(leftSectionImageFile, "contact");
                    updateData.leftsection = updateData.leftsection || {};
                    updateData.leftsection.image = url;
               }

               if (mapImageFile) {
                    const url = await uploadToCloudinary(mapImageFile, "contact");
                    updateData.mapimage = url;
               }
          } else {
               updateData = await req.json();
          }

          let contact = await Contact.findOne();
          if (!contact) {
               contact = new Contact();
          }

          if (updateData.title !== undefined) contact.title = updateData.title;
          if (updateData.leftsection !== undefined) contact.leftsection = updateData.leftsection;
          if (updateData.mapimage !== undefined) contact.mapimage = updateData.mapimage;
          if (updateData.relatedBlogs !== undefined) contact.relatedBlogs = updateData.relatedBlogs;

          await contact.save();
          return NextResponse.json(contact);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
