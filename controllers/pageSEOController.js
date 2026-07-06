import PageSEO from "../models/PageSEO.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

// Get SEO for a specific page
export const getPageSEO = async (req, { params }) => {
     try {
          await connectDB();
          const { pageId } = await params;

          const seo = await PageSEO.findOne({ pageSlug: pageId }).lean();

          if (!seo) {
               return NextResponse.json({ title: "", description: "" });
          }

          const response = NextResponse.json(seo);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// Create or Update SEO for a specific page
export const updatePageSEO = async (req, { params }) => {
     try {
          await connectDB();
          const { pageId } = await params;
          const { title, description } = await req.json();

          let seo = await PageSEO.findOne({ pageSlug: pageId });

          if (seo) {
               seo.title = title;
               seo.description = description;
               await seo.save();
          } else {
               seo = await PageSEO.create({
                    pageSlug: pageId,
                    title,
                    description
               });
          }

          return NextResponse.json(seo);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};