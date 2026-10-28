import Testimonial from "../models/Testimonial.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";
import { triggerFrontendBuild } from "../services/deployService.js";

export const getTestimonials = async (req) => {
     try {
          await connectDB();
          const testimonials = await Testimonial.find().sort({ createdAt: -1 }).lean();
          const response = NextResponse.json(testimonials);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const createTestimonial = async (req) => {
     try {
          await connectDB();
          const formData = await req.formData();
          const quote = formData.get("quote");
          const name = formData.get("name");
          const avatarFile = formData.get("avatar");
          const testimonial = new Testimonial({
               quote,
               name,
               avatar: avatarFile && typeof avatarFile === "object" && typeof avatarFile.arrayBuffer === "function"
                    ? await uploadToCloudinary(avatarFile, "testimonials")
                    : ""
          });

          await testimonial.save();
          await triggerFrontendBuild();
          return NextResponse.json(testimonial);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const updateTestimonial = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          const formData = await req.formData();
          
          const updateData = {
               quote: formData.get("quote"),
               name: formData.get("name")
          };
          const avatarFile = formData.get("avatar");
          if (avatarFile && typeof avatarFile === "object" && typeof avatarFile.arrayBuffer === "function") {
               updateData.avatar = await uploadToCloudinary(avatarFile, "testimonials");
          } else if (formData.get("removeAvatar") === "true") {
               updateData.avatar = "";
          }

          const testimonial = await Testimonial.findByIdAndUpdate(
               id,
               updateData,
               { new: true }
          );

          if (!testimonial) {
               return NextResponse.json({ error: "Testimonial not found" }, { status: 404 });
          }

          await triggerFrontendBuild();
          return NextResponse.json(testimonial);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const deleteTestimonial = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          await Testimonial.findByIdAndDelete(id);
          await triggerFrontendBuild();
          return NextResponse.json({ message: "Deleted" });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};