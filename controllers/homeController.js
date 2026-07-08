import Home from "../models/Home.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";

// GET HOME PAGE CONFIGURATION
export const getHome = async (req) => {
     try {
          await connectDB();
          let home = await Home.findOne();
          if (!home) {
               home = new Home({
                    hero: [{
                         title: "UI/UX Design Agency",
                         startheading: "Crafting",
                         midheading: "Intelligent",
                         endheading: "Experiences",
                         points: [
                              "We design user-centric digital products that convert.",
                              "Collaborative hands-on design learning environment.",
                              "Gain real world industry-relevant skills."
                         ],
                         buttonName: "Book a Call",
                         bgImage: ""
                    }],
                    features: {
                         description: "Our features describe what we do best.",
                         points: []
                    },
                    course: {
                         title: "AI UI/UX Course",
                         startheading: "Transform",
                         midheading: "Your",
                         endheading: "Career",
                         description: "Learn UI/UX design with industry experts."
                    },
                    why: {
                         title: "Why Choose Us",
                         startheading: "Our",
                         midheading: "Impact",
                         endheading: "In Numbers",
                         card: []
                    },
                    philosophy: {
                         title: "Our Philosophy",
                         description: "Design with purpose and intelligence."
                    },
                    testimonials: {
                         startheading: "What",
                         midheading: "Our Clients",
                         endheading: "Say",
                         description: "Hear from our partners and students."
                    },
                    relatedBlogs: {
                         title: "Related Blogs",
                         startheading: "Our",
                         midheading: "Latest",
                         endheading: "Articles",
                         description: "Stay updated with the latest trends and stories from our design blog."
                    }
               });
               await home.save();
          }
          const response = NextResponse.json(home);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE HOME PAGE CONFIGURATION
export const updateHome = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          
          let updateData = {};
          let bgImageFile = null;
          let formData = null;

          if (contentType.includes("multipart/form-data")) {
               formData = await req.formData();
               const dataStr = formData.get("data");
               updateData = dataStr ? JSON.parse(dataStr) : {};
               bgImageFile = formData.get("bgImage");

               // Handle multiple images in the hero slides array
               if (updateData.hero && Array.isArray(updateData.hero)) {
                    for (let i = 0; i < updateData.hero.length; i++) {
                         const imageFile = formData.get(`heroImage_${i}`);
                         if (imageFile) {
                              updateData.hero[i].bgImage = await uploadToCloudinary(imageFile, "home");
                         }
                    }
               }
          } else {
               updateData = await req.json();
          }

          if (bgImageFile) {
               const uploadedUrl = await uploadToCloudinary(bgImageFile, "home");
               if (updateData.hero && updateData.hero.length > 0) {
                    updateData.hero[0].bgImage = uploadedUrl;
               } else {
                    updateData.hero = [{ bgImage: uploadedUrl }];
               }
          }

          let home = await Home.findOne();
          if (!home) {
               home = new Home();
          }

          // Merge fields
          if (updateData.hero !== undefined) home.hero = updateData.hero;
          if (updateData.features !== undefined) home.features = updateData.features;
          if (updateData.course !== undefined) home.course = updateData.course;
          if (updateData.why !== undefined) home.why = updateData.why;
          if (updateData.philosophy !== undefined) home.philosophy = updateData.philosophy;
          if (updateData.testimonials !== undefined) home.testimonials = updateData.testimonials;
          if (updateData.relatedBlogs !== undefined) home.relatedBlogs = updateData.relatedBlogs;

          await home.save();
          return NextResponse.json(home);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
