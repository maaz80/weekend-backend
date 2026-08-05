import Courses from "../models/Courses.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";
import { triggerFrontendBuild } from "../services/deployService.js";

const createSlug = (title) => {
     return title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "") // Keep alphanumeric, spaces, and existing hyphens
          .replace(/\s+/g, "-");
};

// GET COURSES PAGE CONFIGURATION
export const getCourses = async (req) => {
     try {
          await connectDB();
          let courses = await Courses.findOne();
          if (!courses) {
               courses = new Courses({
                    hero: [{
                         startheading: "Explore Our",
                         endheading: "Courses",
                    }],
                    course: [
                         {
                              image: "",
                              alt: "Figma UI/UX Masterclass",
                              title: "Figma UI/UX Masterclass",
                              seotitle: "Figma UI/UX Masterclass | Weekend UX",
                              seodescription: "Learn modern UI/UX design practices using Figma. This course covers everything from wireframing to high-fidelity prototyping and design systems.",
                              slug: "figma-ui-ux-masterclass",
                              author: "Jane Doe",
                              startdate: "July 1, 2026",
                              category: "Design",
                              overview: "Learn modern UI/UX design practices using Figma. This course covers everything from wireframing to high-fidelity prototyping and design systems.",
                              promoTitle: "UI UX Design Courses in Delhi at Affordable Fees",
                              promoDescription: "The demand for skilled UI and UX designers has increased rapidly with the rise of digital experiences.\n\nAs a result, UI UX design courses are now more popular than ever. In Delhi, these programs are among the most in-demand career options in today’s time. Our UI/UX design institute has been providing industry-oriented training in these courses since its inception.",
                              promoBenefits: "Training Since 2006, Small Batches for UX Design, Highly Experienced UX Faculty, 99% Hiring Rate, UX/UI Portfolio Development",
                              brochureTitle: "Comprehensive Syllabus for UI UX Design Training",
                              brochureSubtext: "Chart your path to a thriving career as a UI/UX designer. Explore our course brochure for an in-depth look at the syllabus training from the best UI UX Design Institute in Delhi. Download now.",
                              brochurePhones: "+91 9911782350 or +91 9811818122",
                              brochureLink: "https://example.com/brochure.pdf",
                              chapter: [
                                   {
                                        chaptername: "Introduction to Figma",
                                        lessons: [
                                             {
                                                  lessonname: "Figma Interface Tour"
                                             }
                                        ]
                                   }
                              ],
                              shortTerm: {
                                   title: "Short-term UX Design Courses",
                                   description: "Check out the short duration courses for building a strong foundation in UI & UX design.",
                                   items: [
                                        {
                                             title: "Adobe XD Course",
                                             description: "Adobe XD is a superb tool for UI and UX designers. It enables us for excellent designing, prototyping, and team collaborations. Best UX tool for users using Adobe software.",
                                             duration: "DURATION: 01 MONTH",
                                             iconText: "Xd"
                                        },
                                        {
                                             title: "Figma Fundamentals",
                                             description: "Learn how to build responsive layouts, reusable components, dynamic design systems and interactive high fidelity prototypes in Figma.",
                                             duration: "DURATION: 02 WEEKS",
                                             iconText: "Fg"
                                        }
                                   ]
                              }
                         }
                    ],
                    card: {
                         title: "Join Our Learning Platform",
                         description: "Start learning from industry experts and build your career in design.",
                         buttonname: "Get Started"
                    },
                    relatedBlogs: {
                         title: "Related Blogs",
                         startheading: "Our",
                         midheading: "Latest",
                         endheading: "Articles",
                         description: "Read the latest blogs and articles from our industry leaders."
                    },
                    caseStudies: {
                         title: "UX Case Studies by Our Students",
                         description: "Click and explore our students UX projects done in the institute in their courses.",
                         buttonText: "View All Works",
                         items: [
                              {
                                   image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
                                   alt: "Case Study 1",
                                   link: "#"
                              },
                              {
                                   image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
                                   alt: "Case Study 2",
                                   link: "#"
                              },
                              {
                                   image: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg",
                                   alt: "Case Study 3",
                                   link: "#"
                              }
                         ]
                    },
                    careerDomains: {
                         title: "Explore More Career Domains",
                         description: "Discover ADMEC's diverse courses to continuously enhance your skills through diploma programs in various fields.",
                         items: [
                              { name: "Graphic Design", link: "#", iconName: "graphic", color: "#10B981" },
                              { name: "Web Design", link: "#", iconName: "web", color: "#2563EB" },
                              { name: "Post Production", link: "#", iconName: "post", color: "#9333EA" },
                              { name: "Data Analytics", link: "#", iconName: "analytics", color: "#701A75" },
                              { name: "CAD & Architecture", link: "#", iconName: "cad", color: "#854D0E" },
                              { name: "3D Animation", link: "#", iconName: "animation", color: "#0D9488" },
                              { name: "Web Development", link: "#", iconName: "code", color: "#1E3A8A" },
                              { name: "CAD Textile Design", link: "#", iconName: "textile", color: "#D97706" },
                              { name: "Software Development", link: "#", iconName: "software", color: "#16A34A" },
                              { name: "Digital Marketing", link: "#", iconName: "marketing", color: "#0891B2" },
                              { name: "Machine Learning & AI", link: "#", iconName: "ai", color: "#C026D3" },
                              { name: "Video Editing", link: "#", iconName: "video", color: "#DC2626" }
                         ]
                    }
               });
               await courses.save();
          }

          const defaultCaseStudies = {
               title: "UX Case Studies by Our Students",
               description: "Click and explore our students UX projects done in the institute in their courses.",
               buttonText: "View All Works",
               items: [
                    { image: "/images/hero-bg.webp", alt: "Rezeeride Web Ads Creative", link: "#" },
                    { image: "/images/hero-bg.webp", alt: "Photoshop Creative Poster Design", link: "#" },
                    { image: "/images/hero-bg.webp", alt: "Responsive Frontend Layout Project", link: "#" }
               ]
          };

          const defaultCareerDomains = {
               title: "Explore More Career Domains",
               description: "Discover ADMEC's diverse courses to continuously enhance your skills through diploma programs in various fields.",
               items: [
                    { name: "Graphic Design", link: "#", iconName: "graphic", color: "#10B981" },
                    { name: "Web Design", link: "#", iconName: "web", color: "#2563EB" },
                    { name: "Post Production", link: "#", iconName: "post", color: "#9333EA" },
                    { name: "Data Analytics", link: "#", iconName: "analytics", color: "#701A75" },
                    { name: "CAD & Architecture", link: "#", iconName: "cad", color: "#854D0E" },
                    { name: "3D Animation", link: "#", iconName: "animation", color: "#0D9488" },
                    { name: "Web Development", link: "#", iconName: "code", color: "#1E3A8A" },
                    { name: "CAD Textile Design", link: "#", iconName: "textile", color: "#D97706" },
                    { name: "Software Development", link: "#", iconName: "software", color: "#16A34A" },
                    { name: "Digital Marketing", link: "#", iconName: "marketing", color: "#0891B2" },
                    { name: "Machine Learning & AI", link: "#", iconName: "ai", color: "#C026D3" },
                    { name: "Video Editing", link: "#", iconName: "video", color: "#DC2626" }
               ]
          };

          if (!courses.caseStudies || !courses.caseStudies.items || courses.caseStudies.items.length === 0) {
               courses.caseStudies = (courses.course?.[0]?.caseStudies && courses.course[0].caseStudies.items?.length > 0)
                    ? courses.course[0].caseStudies
                    : defaultCaseStudies;
               await courses.save();
          }
          if (!courses.careerDomains || !courses.careerDomains.items || courses.careerDomains.items.length === 0) {
               courses.careerDomains = (courses.course?.[0]?.careerDomains && courses.course[0].careerDomains.items?.length > 0)
                    ? courses.course[0].careerDomains
                    : defaultCareerDomains;
               await courses.save();
          }

          const response = NextResponse.json(courses);
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE COURSES PAGE CONFIGURATION
export const updateCourses = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          
          let updateData = {};

          if (contentType.includes("multipart/form-data")) {
               const formData = await req.formData();
               console.log("--- updateCourses MULTIPART UPLOAD ---");
               console.log("Incoming Content-Type:", contentType);
               console.log("FormData Keys:", Array.from(formData.keys()));
               
               const dataStr = formData.get("data");
               updateData = dataStr ? JSON.parse(dataStr) : {};
               console.log("Parsed updateData Courses Count:", updateData.course?.length);
               
               // Handle course images
               if (updateData.course && Array.isArray(updateData.course)) {
                    for (let i = 0; i < updateData.course.length; i++) {
                         // Course Image
                         const imageFile = formData.get(`courseImage_${i}`);
                         if (imageFile) {
                              console.log(`Uploading course image for index ${i}...`);
                              updateData.course[i].image = await uploadToCloudinary(imageFile, "courses/images");
                              console.log(`Course image uploaded successfully: ${updateData.course[i].image}`);
                         }

                         // Case studies images
                         if (updateData.course[i].caseStudies && Array.isArray(updateData.course[i].caseStudies.items)) {
                              for (let j = 0; j < updateData.course[i].caseStudies.items.length; j++) {
                                   const caseStudyFile = formData.get(`course_${i}_caseStudy_${j}`);
                                   if (caseStudyFile) {
                                        console.log(`Uploading case study image for course ${i}, item ${j}...`);
                                        updateData.course[i].caseStudies.items[j].image = await uploadToCloudinary(caseStudyFile, "courses/casestudies");
                                        console.log(`Case study image uploaded successfully: ${updateData.course[i].caseStudies.items[j].image}`);
                                   }
                              }
                         }
                    }
               }

               // Handle global case study image uploads if present
               if (updateData.caseStudies && Array.isArray(updateData.caseStudies.items)) {
                    for (let j = 0; j < updateData.caseStudies.items.length; j++) {
                         const caseStudyFile = formData.get(`globalCaseStudy_${j}`) || formData.get(`caseStudy_${j}`);
                         if (caseStudyFile) {
                              console.log(`Uploading global case study image ${j}...`);
                              updateData.caseStudies.items[j].image = await uploadToCloudinary(caseStudyFile, "courses/casestudies");
                         }
                    }
               }
          } else {
               updateData = await req.json();
          }

          // Auto-generate missing slugs in updateData.course
          if (updateData.course && Array.isArray(updateData.course)) {
               updateData.course = updateData.course.map(c => {
                    if (c.title && !c.slug) {
                         c.slug = createSlug(c.title);
                    } else if (c.slug) {
                         c.slug = createSlug(c.slug);
                    }
                    return c;
               });
          }

          let courses = await Courses.findOne();
          if (!courses) {
               courses = new Courses();
          }

          if (updateData.hero !== undefined) courses.hero = updateData.hero;
          if (updateData.course !== undefined) courses.course = updateData.course;
          if (updateData.card !== undefined) courses.card = updateData.card;
          if (updateData.relatedBlogs !== undefined) courses.relatedBlogs = updateData.relatedBlogs;
          if (updateData.caseStudies !== undefined) courses.caseStudies = updateData.caseStudies;
          if (updateData.careerDomains !== undefined) courses.careerDomains = updateData.careerDomains;

          await courses.save();
          await triggerFrontendBuild("Courses", courses?._id);
          return NextResponse.json(courses);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// GET SINGLE COURSE BY SLUG / ID (from the list of courses)
export const getCourseBySlug = async (req, { params }) => {
     try {
          await connectDB();
          const { idOrSlug } = await params;
          const coursesPage = await Courses.findOne();
          
          if (!coursesPage || !coursesPage.course || coursesPage.course.length === 0) {
               return NextResponse.json({ error: "No courses configured" }, { status: 404 });
          }

          // Search in course array by slug or _id
          let courseItem = coursesPage.course.find(c => c.slug === idOrSlug || (c._id && c._id.toString() === idOrSlug));

          if (!courseItem && idOrSlug) {
               const cleanSlug = idOrSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
               courseItem = coursesPage.course.find(c => {
                    const cSlug = (c.slug || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                    const cTitle = (c.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                    return (cSlug && (cSlug.includes(cleanSlug) || cleanSlug.includes(cSlug))) ||
                           (cTitle && (cTitle.includes(cleanSlug) || cleanSlug.includes(cTitle)));
               });
          }

          // Fallback to first course if requested slug is not found
          if (!courseItem) {
               courseItem = coursesPage.course[0];
          }

          const result = courseItem.toObject ? courseItem.toObject() : JSON.parse(JSON.stringify(courseItem));
          result.caseStudies = (coursesPage.caseStudies && coursesPage.caseStudies.items && coursesPage.caseStudies.items.length > 0)
               ? coursesPage.caseStudies
               : result.caseStudies;
          result.careerDomains = (coursesPage.careerDomains && coursesPage.careerDomains.items && coursesPage.careerDomains.items.length > 0)
               ? coursesPage.careerDomains
               : result.careerDomains;

          return NextResponse.json(result);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
