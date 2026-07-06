import About from "../models/About.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";

// GET ABOUT PAGE CONFIGURATION
export const getAbout = async (req) => {
     try {
          await connectDB();
          let about = await About.findOne().lean();
          if (!about) {
               const newAbout = new About({
                    hero: [{
                         title: "We are Weekend UX",
                         heading: "Designing a Better World Together",
                         buttonName: "Learn More",
                         bgImage: ""
                    }],
                    features: {
                         description: "Our core principles drive everything we build.",
                         points: []
                    },
                    quote: "Good design is making something intelligible and memorable.",
                    why: {
                         title: "Why Us",
                         startheading: "Our",
                         midheading: "Proven",
                         endheading: "Track Record",
                         card: []
                    },
                    team: {
                         title: "Meet the Team",
                         startheading: "Our",
                         midheading: "Creative",
                         endheading: "Minds",
                         description: "Talented designers and developers dedicated to excellence.",
                         imageCard: []
                    },
                    relatedBlogs: {
                         title: "Related Blogs",
                         startheading: "From",
                         midheading: "Our",
                         endheading: "Journal",
                         description: "Read our latest news and announcements."
                    }
               });
               await newAbout.save();
               about = newAbout.toObject();
          }
          const response = NextResponse.json(about);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE ABOUT PAGE CONFIGURATION
export const updateAbout = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          
          let updateData = {};
          let bgImageFile = null;

          if (contentType.includes("multipart/form-data")) {
               const formData = await req.formData();
               const dataStr = formData.get("data");
               updateData = dataStr ? JSON.parse(dataStr) : {};
               
               bgImageFile = formData.get("bgImage");
               if (bgImageFile) {
                    const url = await uploadToCloudinary(bgImageFile, "about");
                    if (updateData.hero && updateData.hero.length > 0) {
                         updateData.hero[0].bgImage = url;
                    } else {
                         updateData.hero = [{ bgImage: url }];
                    }
               }

               if (updateData.team && updateData.team.imageCard) {
                    for (let i = 0; i < updateData.team.imageCard.length; i++) {
                         const file = formData.get(`teamImage_${i}`);
                         if (file) {
                              updateData.team.imageCard[i].image = await uploadToCloudinary(file, "about/team");
                         }
                    }
               }
          } else {
               updateData = await req.json();
          }

          let about = await About.findOne();
          if (!about) {
               about = new About();
          }

          if (updateData.hero !== undefined) about.hero = updateData.hero;
          if (updateData.features !== undefined) about.features = updateData.features;
          if (updateData.quote !== undefined) about.quote = updateData.quote;
          if (updateData.why !== undefined) about.why = updateData.why;
          if (updateData.team !== undefined) about.team = updateData.team;
          if (updateData.relatedBlogs !== undefined) about.relatedBlogs = updateData.relatedBlogs;

          await about.save();
          return NextResponse.json(about);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
