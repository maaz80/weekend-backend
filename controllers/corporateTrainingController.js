import CorporateTraining from "../models/CorporateTraining.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";
import { triggerFrontendBuild } from "../services/deployService.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

const defaultContent = {
     hero: {
          eyebrow: "Corporate Training",
          heading: "Upskill Your Workforce,\nAccelerate AI & Digital Readiness",
          buttonText: "Start Your Journey",
          buttonLink: "/contact-us",
          backgroundImage: "/images/weekend-ux-corporate-training-hero-bg.webp"
     },
     trustedBy: {
          startheading: "Trusted",
          midheading: "By",
          endheading: "Leading Organizations Worldwide",
          description: "Our corporate training programs help organizations build the skills their teams need to grow.",
          backgroundImage: "/images/weekend-ux-why-our-students-hiring-bg.webp",
          partners: [
               { name: "Weekend UX", image: "/images/weekend-ux-logo.webp", alt: "Weekend UX" },
               { name: "Partner", image: "", alt: "Partner" },
               { name: "Partner", image: "", alt: "Partner" },
               { name: "Partner", image: "", alt: "Partner" },
               { name: "Partner", image: "", alt: "Partner" }
          ]
     },
     whyUs: {
          eyebrow: "Why Us",
          headingStart: "Why",
          headingHighlight: "Top Companies",
          headingEnd: "Prefer WeekendUX",
          description: "Simplilearn for Business helps organizations convert learning investments into measurable goals. Unlimited hands-on learning that fuels career growth, fills in-demand roles, and builds complementary skills with real business impact.",
          backgroundImage: "/images/weekend-ux-why-us-bg.webp",
          cardImageOne: "/images/weekend-ux-why-us-card-1.png",
          cardImageTwo: "/images/weekend-ux-why-us-card-2.png",
          points: [
               "Customized curriculum built with industry leaders, for industry leaders",
               "Extensive GenAI curriculum from foundation to advanced across domains. Learning journeys covering 40+ AI and digital roles.",
               "Assignments and project work review and feedback from industry SMEs",
               "Comprehensive learning across digital literacy and technology, with soft skills programs for real workplace impact",
               "Assignments and project work review and feedback from industry SMEs",
               "Assignments and project work review and feedback from industry SMEs"
          ]
     },
     trainingOptions: {
          eyebrow: "Training Options",
          headingStart: "Learning Model That",
          headingHighlight: "Moves",
          headingEnd: "The Business Forward",
          backgroundImage: "/images/weekend-ux-why-our-students-hiring-bg.webp",
          showcaseBackgroundImage: "/images/weekend-ux-training-options-card-bg.webp",
          options: [
               { id: "ui", title: "User Interface Design", image: "/images/weekend-ux-training-options-card-center-image.webp", topics: ["Design Systems", "Figma Advanced Mastery", "Responsive Layouts", "Micro-Interactions", "Component Architecture"] },
               { id: "ai", title: "Artificial Intelligence", image: "/images/weekend-ux-training-options-card-center-image.webp", topics: ["Gen AI", "AI Design Tools", "AI Prompting", "AI In Research", "AI In Wireframing"] },
               { id: "ux", title: "User Experience Design", image: "/images/weekend-ux-training-options-card-center-image.webp", topics: ["User Research & Testing", "Information Architecture", "Wireframing & Prototyping", "Usability Audits", "Heuristic Evaluation"] },
               { id: "graphic", title: "Graphic Design", image: "/images/weekend-ux-training-options-card-center-image.webp", topics: ["Brand Identity & Systems", "Typography & Layout", "Visual Storytelling", "Vector Illustration", "Marketing Collaterals"] },
               { id: "video", title: "Video Design & Editing", image: "/images/weekend-ux-training-options-card-center-image.webp", topics: ["Premiere Pro & DaVinci", "Color Grading & LUTs", "Audio & Sound Design", "Storyboarding & Pace", "Narrative Video Editing"] },
               { id: "motion", title: "Motion & Animation", image: "/images/weekend-ux-training-options-card-center-image.webp", topics: ["After Effects 2D Motion", "UI Motion Guidelines", "3D Motion Graphics", "Kinetic Typography", "Lottie Micro-Animations"] }
          ]
     },
     outcomes: {
          headingStart: "What Learning",
          headingHighlight: "Delivers",
          headingEnd: "For Your Organization",
          cards: [
               { icon: "award", value: "95%", label: "Certification Pass Rate" },
               { icon: "star", value: "85%", label: "Average Completion Rate" },
               { icon: "dollar-sign", value: "40%", label: "Savings on Training Costs" }
          ]
     },
     talkToExpert: {
          title: "Talk To Expert",
          startheading: "Explore The Right",
          midheading: "Learning Solutions",
          endheading: "For Your Training Needs.",
          formTitle: "Request Callback",
          buttonLabel: "Get in Touch"
     }
};

export const getCorporateTraining = async () => {
     try {
          await connectDB();
          const data = await CorporateTraining.findOne().lean();
          return NextResponse.json(data || defaultContent);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

export const updateCorporateTraining = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          let updateData;
          let formData = null;

          if (contentType.includes("multipart/form-data")) {
               formData = await req.formData();
               const data = formData.get("data");
               updateData = typeof data === "string" ? JSON.parse(data) : {};
          } else {
               updateData = await req.json();
          }

          const { hero, trustedBy, whyUs, trainingOptions, outcomes, talkToExpert } = updateData;

          if (!hero || !trustedBy || !Array.isArray(trustedBy.partners) || !whyUs || !Array.isArray(whyUs.points) || !trainingOptions || !Array.isArray(trainingOptions.options) || !outcomes || !Array.isArray(outcomes.cards) || !talkToExpert) {
               return NextResponse.json({ error: "Valid Corporate Training section content is required." }, { status: 400 });
          }

          if (formData) {
               for (let index = 0; index < trustedBy.partners.length; index++) {
                    const file = formData.get(`partnerImage_${index}`);
                    if (file) {
                         trustedBy.partners[index].image = await uploadToCloudinary(file, "corporate-training/partners");
                    }
               }

               for (const field of ["backgroundImage", "cardImageOne", "cardImageTwo"]) {
                    const file = formData.get(`whyUs_${field}`);
                    if (file) {
                         whyUs[field] = await uploadToCloudinary(file, "corporate-training/why-us");
                    }
               }

               for (let index = 0; index < trainingOptions.options.length; index++) {
                    const file = formData.get(`trainingOptionImage_${index}`);
                    if (file) {
                         trainingOptions.options[index].image = await uploadToCloudinary(file, "corporate-training/options");
                    }
               }

               for (const field of ["backgroundImage", "showcaseBackgroundImage"]) {
                    const file = formData.get(`trainingOptions_${field}`);
                    if (file) {
                         trainingOptions[field] = await uploadToCloudinary(file, "corporate-training/options");
                    }
               }
          }

          const data = await CorporateTraining.findOneAndUpdate(
               {},
               { $set: { hero, trustedBy, whyUs, trainingOptions, outcomes, talkToExpert } },
               { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
          );

          await triggerFrontendBuild();
          return NextResponse.json(data);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
