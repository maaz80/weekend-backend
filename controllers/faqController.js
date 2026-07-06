import Faq from "../models/Faq.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

// Get data for a specific page
export const getFaq = async (req, { params }) => {
     try {
          await connectDB();
          const { pageId } = await params;

          const data = await Faq.findOne({ pageSlug: pageId }).lean();

          if (!data) {
               return NextResponse.json({
                    title: "",
                    startheading: "",
                    midheading: "",
                    endheading: "",
                    description: "",
                    faq: []
               });
          }

          const response = NextResponse.json(data);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// Create or Update data for a specific page
export const updateFaq = async (req, { params }) => {
     try {
          await connectDB();
          const { pageId } = await params;
          const { title, startheading, midheading, endheading, description, faq } = await req.json();

          let data = await Faq.findOne({ pageSlug: pageId });

          if (data) {
               data.title = title;
               data.startheading = startheading;
               data.midheading = midheading;
               data.endheading = endheading;
               data.description = description;
               data.faq = faq;
               await data.save();
          } else {
               data = await Faq.create({
                    pageSlug: pageId,
                    title,
                    startheading,
                    midheading,
                    endheading,
                    description,
                    faq
               });
          }

          return NextResponse.json(data);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};