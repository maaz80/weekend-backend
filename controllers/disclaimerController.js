import Disclaimer from "../models/Disclaimer.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

// GET DISCLAIMER CONFIGURATION
export const getDisclaimer = async (req) => {
     try {
          await connectDB();
          let disclaimer = await Disclaimer.findOne().lean();
          if (!disclaimer) {
               const newDisclaimer = new Disclaimer({
                    title: "Disclaimer",
                    content: "Your disclaimer text goes here...",
                    relatedBlogs: {
                         title: "Related Blogs",
                         startheading: "Our",
                         midheading: "Latest",
                         endheading: "Articles",
                         description: "Stay updated with the latest trends and stories from our design blog."
                    }
               });
               await newDisclaimer.save();
               disclaimer = newDisclaimer.toObject();
          }
          const response = NextResponse.json(disclaimer);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE DISCLAIMER CONFIGURATION
export const updateDisclaimer = async (req) => {
     try {
          await connectDB();
          const { title, content, relatedBlogs } = await req.json();
          const updated = await Disclaimer.findOneAndUpdate(
               {},
               { title, content, relatedBlogs },
               { new: true, upsert: true }
          );
          return NextResponse.json(updated);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
