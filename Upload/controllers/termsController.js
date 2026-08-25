import Terms from "../models/Terms.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";
import { triggerFrontendBuild } from "../services/deployService.js";

// GET TERMS & CONDITIONS CONFIGURATION
export const getTerms = async (req) => {
     try {
          await connectDB();
          let terms = await Terms.findOne().lean();
          if (!terms) {
               const newTerms = new Terms({
                    title: "Terms & Conditions",
                    content: "Your terms and conditions text goes here...",
                    relatedBlogs: {
                         title: "Related Blogs",
                         startheading: "Our",
                         midheading: "Latest",
                         endheading: "Articles",
                         description: "Stay updated with the latest trends and stories from our design blog."
                    }
               });
               await newTerms.save();
               terms = newTerms.toObject();
          }
          const response = NextResponse.json(terms);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE TERMS & CONDITIONS CONFIGURATION
export const updateTerms = async (req) => {
     try {
          await connectDB();
          const { title, content, relatedBlogs } = await req.json();
          const updated = await Terms.findOneAndUpdate(
               {},
               { title, content, relatedBlogs },
               { new: true, upsert: true }
          );
          await triggerFrontendBuild();
          return NextResponse.json(updated);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
