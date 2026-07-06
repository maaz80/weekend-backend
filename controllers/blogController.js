import Blog from "../models/Blog.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";

// Slug generator
const createSlug = (title) => {
     return title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "") // Keep alphanumeric, spaces, and existing hyphens
          .replace(/\s+/g, "-");
};

// GET BLOG PAGE CONFIGURATION / ALL BLOGS
export const getBlogs = async (req) => {
     try {
          await connectDB();
          let blogPage = await Blog.findOne().lean();
          if (!blogPage) {
               const newBlogPage = new Blog({
                    hero: {
                         starttitle: "Our Latest",
                         endtitle: "Blogs"
                    },
                    featuredblogs: {
                         starttitle: "Featured",
                         endtitle: "Stories"
                    },
                    blogs: [
                         {
                              image: "",
                              alt: "Getting Started with UI/UX",
                              title: "Getting Started with UI/UX",
                              seotitle: "Getting Started with UI/UX | Weekend UX",
                              seodescription: "A comprehensive guide to starting your career in UI/UX design.",
                              slug: "getting-started-with-ui-ux",
                              date: "June 19, 2026",
                              read: "5 min read",
                              content: [
                                   { data: "Design is not just what it looks like and feels like. Design is how it works." },
                                   { data: "In this article, we explore the fundamentals of user experience and user interface design..." }
                              ]
                         }
                    ]
               });
               await newBlogPage.save();
               blogPage = newBlogPage.toObject();
          }
          const response = NextResponse.json(blogPage);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE BLOG PAGE CONFIGURATION (GLOBAL)
export const updateBlogPage = async (req) => {
     try {
          await connectDB();
          const contentType = req.headers.get("content-type") || "";
          
          let updateData = {};

          if (contentType.includes("multipart/form-data")) {
               const formData = await req.formData();
               const dataStr = formData.get("data");
               updateData = dataStr ? JSON.parse(dataStr) : {};
               
               // Handle images in the blogs list
               if (updateData.blogs && Array.isArray(updateData.blogs)) {
                    for (let i = 0; i < updateData.blogs.length; i++) {
                         const imageFile = formData.get(`blogImage_${i}`);
                         if (imageFile) {
                              updateData.blogs[i].image = await uploadToCloudinary(imageFile, "blogs");
                         }
                         
                         // Generate slug if not present
                         if (updateData.blogs[i].title && !updateData.blogs[i].slug) {
                              updateData.blogs[i].slug = createSlug(updateData.blogs[i].title);
                         } else if (updateData.blogs[i].slug) {
                              updateData.blogs[i].slug = createSlug(updateData.blogs[i].slug);
                         }
                    }
               }
          } else {
               updateData = await req.json();
               if (updateData.blogs && Array.isArray(updateData.blogs)) {
                    for (let i = 0; i < updateData.blogs.length; i++) {
                         if (updateData.blogs[i].title && !updateData.blogs[i].slug) {
                              updateData.blogs[i].slug = createSlug(updateData.blogs[i].title);
                         } else if (updateData.blogs[i].slug) {
                              updateData.blogs[i].slug = createSlug(updateData.blogs[i].slug);
                         }
                    }
               }
          }

          let blogPage = await Blog.findOne();
          if (!blogPage) {
               blogPage = new Blog();
          }

          if (updateData.hero !== undefined) blogPage.hero = updateData.hero;
          if (updateData.featuredblogs !== undefined) blogPage.featuredblogs = updateData.featuredblogs;
          if (updateData.blogs !== undefined) blogPage.blogs = updateData.blogs;

          await blogPage.save();
          return NextResponse.json(blogPage);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// GET SINGLE BLOG BY SLUG / ID (from the list of blogs)
export const getBlogBySlug = async (req, { params }) => {
     try {
          await connectDB();
          const { idOrSlug } = await params;
          const blogPage = await Blog.findOne().select("blogs").lean();
          
          if (!blogPage) {
               return NextResponse.json({ error: "No blogs configured" }, { status: 404 });
          }

          // Search in blogs array by slug or _id
          const blog = blogPage.blogs.find(b => b.slug === idOrSlug || (b._id && b._id.toString() === idOrSlug));

          if (!blog) {
               return NextResponse.json({ error: "Blog not found" }, { status: 404 });
          }

          const response = NextResponse.json(blog);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

// CREATE INDIVIDUAL BLOG (POST /api/blogs)
export const createBlog = async (req) => {
     try {
          await connectDB();
          const formData = await req.formData();
          
          const title = formData.get("title");
          const alt = formData.get("alt");
          const seotitle = formData.get("seotitle");
          const seodescription = formData.get("seodescription");
          const date = formData.get("date");
          const read = formData.get("read");
          
          // Content is sent as serialized JSON array of { data: String }
          const contentStr = formData.get("content");
          const content = contentStr ? JSON.parse(contentStr) : [];

          // FAQ is sent as serialized JSON object containing meta and items
          const faqStr = formData.get("faq");
          const faq = faqStr ? JSON.parse(faqStr) : { title: "", startheading: "", midheading: "", endheading: "", description: "", items: [] };
          
          const imageFile = formData.get("image");
          let imageUrl = "";
          if (imageFile) {
               imageUrl = await uploadToCloudinary(imageFile, "blogs");
          }

          // Slug generation
          const customSlug = formData.get("slug");
          const baseSlug = customSlug ? createSlug(customSlug) : createSlug(title);
          
          let blogPage = await Blog.findOne();
          if (!blogPage) {
               blogPage = new Blog({
                    hero: { starttitle: "Our Latest", endtitle: "Blogs" },
                    featuredblogs: { starttitle: "Featured", endtitle: "Stories" },
                    blogs: []
               });
          }

          // Ensure slug uniqueness inside array
          let slug = baseSlug;
          let count = 1;
          while (blogPage.blogs.some(b => b.slug === slug)) {
               slug = `${baseSlug}-${count++}`;
          }

          const featuredVal = formData.get("featured");
          const featured = featuredVal === "true" || featuredVal === true;

          const newBlogItem = {
               image: imageUrl,
               alt: alt || title,
               title,
               seotitle: seotitle || title,
               seodescription: seodescription || (content.length > 0 ? content[0].data?.slice(0, 150) : ""),
               slug,
               date: date || new Date().toLocaleDateString(),
               read: read || "5 min read",
               content: content,
               featured: featured,
               faq: faq
          };

          blogPage.blogs.push(newBlogItem);
          await blogPage.save();

          // Return the newly created blog item (with its assigned _id)
          const createdBlog = blogPage.blogs[blogPage.blogs.length - 1];
          return NextResponse.json(createdBlog);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

// UPDATE INDIVIDUAL BLOG BY SLUG / ID (PUT /api/blogs/[idOrSlug])
export const updateBlog = async (req, { params }) => {
     try {
          await connectDB();
          const { idOrSlug } = await params;
          const formData = await req.formData();
          
          let blogPage = await Blog.findOne();
          if (!blogPage) {
               return NextResponse.json({ error: "No blogs configured" }, { status: 404 });
          }

          // Find index of the blog post
          const blogIndex = blogPage.blogs.findIndex(b => b.slug === idOrSlug || (b._id && b._id.toString() === idOrSlug));
          if (blogIndex === -1) {
               return NextResponse.json({ error: "Blog not found" }, { status: 404 });
          }

          const existingBlog = blogPage.blogs[blogIndex];

          // Read fields from formData
          const title = formData.get("title");
          const alt = formData.get("alt");
          const seotitle = formData.get("seotitle");
          const seodescription = formData.get("seodescription");
          const date = formData.get("date");
          const read = formData.get("read");
          
          const contentStr = formData.get("content");
          if (contentStr) {
               existingBlog.content = JSON.parse(contentStr);
          }

          const faqStr = formData.get("faq");
          if (faqStr) {
               existingBlog.faq = JSON.parse(faqStr);
          }
          
          if (title) existingBlog.title = title;
          if (alt !== null && alt !== undefined) existingBlog.alt = alt;
          if (seotitle !== null && seotitle !== undefined) existingBlog.seotitle = seotitle;
          if (seodescription !== null && seodescription !== undefined) existingBlog.seodescription = seodescription;
          if (date) existingBlog.date = date;
          if (read) existingBlog.read = read;

          const featuredVal = formData.get("featured");
          if (featuredVal !== null && featuredVal !== undefined) {
               existingBlog.featured = featuredVal === "true" || featuredVal === true;
          }

          // Handle slug update if custom slug or title changes
          const customSlug = formData.get("slug");
          if (customSlug) {
               const baseSlug = createSlug(customSlug);
               let slug = baseSlug;
               let count = 1;
               while (blogPage.blogs.some((b, idx) => idx !== blogIndex && b.slug === slug)) {
                    slug = `${baseSlug}-${count++}`;
               }
               existingBlog.slug = slug;
          } else if (title) {
               const baseSlug = createSlug(title);
               let slug = baseSlug;
               let count = 1;
               while (blogPage.blogs.some((b, idx) => idx !== blogIndex && b.slug === slug)) {
                    slug = `${baseSlug}-${count++}`;
               }
               existingBlog.slug = slug;
          }

          const imageFile = formData.get("image");
          if (imageFile) {
               existingBlog.image = await uploadToCloudinary(imageFile, "blogs");
          }

          // Mark nested array path as modified
          blogPage.markModified('blogs');
          await blogPage.save();

          return NextResponse.json(blogPage.blogs[blogIndex]);
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};

// DELETE INDIVIDUAL BLOG BY SLUG / ID (DELETE /api/blogs/[idOrSlug])
export const deleteBlog = async (req, { params }) => {
     try {
          await connectDB();
          const { idOrSlug } = await params;
          let blogPage = await Blog.findOne();
          if (!blogPage) {
               return NextResponse.json({ error: "No blogs configured" }, { status: 404 });
          }

          const blogIndex = blogPage.blogs.findIndex(b => b.slug === idOrSlug || (b._id && b._id.toString() === idOrSlug));
          if (blogIndex === -1) {
               return NextResponse.json({ error: "Blog not found" }, { status: 404 });
          }

          blogPage.blogs.splice(blogIndex, 1);
          await blogPage.save();

          return NextResponse.json({ message: "Blog post deleted successfully" });
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};