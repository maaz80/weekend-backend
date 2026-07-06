import Testimonial from "../models/Testimonial.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";

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
          const role = formData.get("role");

          const testimonial = new Testimonial({
               quote,
               name,
               role
          });

          await testimonial.save();
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
               name: formData.get("name"),
               role: formData.get("role")
          };

          const testimonial = await Testimonial.findByIdAndUpdate(
               id,
               updateData,
               { new: true }
          );

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
          return NextResponse.json({ message: "Deleted" });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};