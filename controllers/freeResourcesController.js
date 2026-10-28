import FreeResources from "../models/FreeResources.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";
import { triggerFrontendBuild } from "../services/deployService.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const defaultContent = {
     hero: {
          subheading: "Free Resources",
          heading: "Explore Free UI/UX Design Resources",
          buttonText: "Explore Resources"
     },
     featuredResources: {
          eyebrow: "Featured",
          headingStart: "Featured",
          headingHighlight: "Resources",
          description: "Explore insights, tips, and courses created to help you build practical design skills.",
          courseSlugs: [],
          promoTitle: "Take the next step in your design journey",
          promoDescription: "Learn how to make design that sells.",
          promoButtonText: "Book a Call",
          promoButtonLink: "/contact-us"
     },
     popularTutorials: {
          headingStart: "Popular",
          headingHighlight: "Tutorials",
          tutorials: [
               { title: "Why should a learner prefer to study on campus", image: "/images/hero-bg.webp", link: "/blog" },
               { title: "Why should a learner prefer to study on campus", image: "/images/hero-bg.webp", link: "/blog" },
               { title: "Why should a learner prefer to study on campus rather than other options", image: "/images/weekend-ux-contact-decorative-image.webp", link: "/blog" }
          ]
     }
};

export const getFreeResources = async () => {
     try {
          await connectDB();
          const data = await FreeResources.findOne().lean();
          return NextResponse.json(data || defaultContent);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

export const updateFreeResources = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          let updateData;
          let formData = null;
          if (contentType.includes("multipart/form-data")) {
               formData = await req.formData();
               const serializedData = formData.get("data");
               updateData = typeof serializedData === "string" ? JSON.parse(serializedData) : {};
          } else {
               updateData = await req.json();
          }

          const { hero, featuredResources, popularTutorials } = updateData;

          if (!hero || !featuredResources || !Array.isArray(featuredResources.courseSlugs) ||
               !popularTutorials || !Array.isArray(popularTutorials.tutorials)) {
               return NextResponse.json({ error: "Valid Free Resources hero, featured course, and tutorial content are required." }, { status: 400 });
          }

          if (formData) {
               for (let index = 0; index < popularTutorials.tutorials.length; index++) {
                    const imageFile = formData.get(`tutorialImage_${index}`);
                    if (imageFile && typeof imageFile === "object" && typeof imageFile.arrayBuffer === "function") {
                         popularTutorials.tutorials[index].image = await uploadToCloudinary(imageFile, "free-resources/tutorials");
                    }
               }
          }

          const data = await FreeResources.findOneAndUpdate(
               {},
               { $set: { hero, featuredResources, popularTutorials } },
               { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
          );

          await triggerFrontendBuild();
          return NextResponse.json(data);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
