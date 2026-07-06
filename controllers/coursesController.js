import Courses from "../models/Courses.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";

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
                              courselength: "12 Weeks",
                              totalstudents: "1,200",
                              levels: "All Levels",
                              totallessons: "45",
                              startdate: "July 1, 2026",
                              duration: "30h 45m",
                              category: "Design",
                              overview: "Learn modern UI/UX design practices using Figma. This course covers everything from wireframing to high-fidelity prototyping and design systems.",
                              chapter: [
                                   {
                                        chaptername: "Introduction to Figma",
                                        totallessons: "5",
                                        lessons: [
                                             {
                                                  lessonname: "Figma Interface Tour",
                                                  video: {
                                                       videourl: "",
                                                       duration: "10:15"
                                                  }
                                             }
                                        ]
                                   }
                              ]
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
                    }
               });
               await courses.save();
          }
          const response = NextResponse.json(courses);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
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
               
               // Handle course images and videos
               if (updateData.course && Array.isArray(updateData.course)) {
                    for (let i = 0; i < updateData.course.length; i++) {
                         // Course Image
                         const imageFile = formData.get(`courseImage_${i}`);
                         if (imageFile) {
                              console.log(`Uploading course image for index ${i}...`);
                              updateData.course[i].image = await uploadToCloudinary(imageFile, "courses/images");
                              console.log(`Course image uploaded successfully: ${updateData.course[i].image}`);
                         }
                         
                         // Lesson Videos (checking if chapter is an array or legacy object)
                         if (updateData.course[i].chapter) {
                              if (Array.isArray(updateData.course[i].chapter)) {
                                   for (let chIdx = 0; chIdx < updateData.course[i].chapter.length; chIdx++) {
                                        const chapter = updateData.course[i].chapter[chIdx];
                                        if (chapter && chapter.lessons && Array.isArray(chapter.lessons)) {
                                             for (let j = 0; j < chapter.lessons.length; j++) {
                                                  const videoKey = `courseVideo_${i}_${chIdx}_${j}`;
                                                  const videoFile = formData.get(videoKey);
                                                  if (videoFile) {
                                                       console.log(`Found video file for key ${videoKey}. File Name: ${videoFile.name}, Size: ${videoFile.size} bytes`);
                                                       chapter.lessons[j].video = chapter.lessons[j].video || {};
                                                       
                                                       console.log(`Uploading video to Cloudinary for key ${videoKey}...`);
                                                       const uploadedUrl = await uploadToCloudinary(videoFile, "courses/videos");
                                                       console.log(`Video uploaded successfully to URL: ${uploadedUrl}`);
                                                       
                                                       chapter.lessons[j].video.videourl = uploadedUrl;
                                                  }
                                             }
                                        }
                                   }
                              } else if (updateData.course[i].chapter.lessons) {
                                   // Legacy single-chapter object fallback
                                   for (let j = 0; j < updateData.course[i].chapter.lessons.length; j++) {
                                        const videoKey = `courseVideo_${i}_${j}`;
                                        const videoFile = formData.get(videoKey);
                                        if (videoFile) {
                                             console.log(`Found video file for key ${videoKey}. File Name: ${videoFile.name}, Size: ${videoFile.size} bytes`);
                                             updateData.course[i].chapter.lessons[j].video = updateData.course[i].chapter.lessons[j].video || {};
                                             
                                             console.log(`Uploading video to Cloudinary for key ${videoKey}...`);
                                             const uploadedUrl = await uploadToCloudinary(videoFile, "courses/videos");
                                             console.log(`Video uploaded successfully to URL: ${uploadedUrl}`);
                                             
                                             updateData.course[i].chapter.lessons[j].video.videourl = uploadedUrl;
                                        }
                                   }
                              }
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

          await courses.save();
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
          
          if (!coursesPage) {
               return NextResponse.json({ error: "No courses configured" }, { status: 404 });
          }

          // Search in course array by slug or _id
          const courseItem = coursesPage.course.find(c => c.slug === idOrSlug || (c._id && c._id.toString() === idOrSlug));

          if (!courseItem) {
               return NextResponse.json({ error: "Course not found" }, { status: 404 });
          }

          return NextResponse.json(courseItem);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
