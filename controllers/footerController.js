import Footer from "../models/Footer.js";
import connectDB from "../config/db.js";
import { NextResponse } from "next/server";

// GET ALL FOOTER COLUMNS
export const getFooterColumns = async (req) => {
     try {
          await connectDB();
          const columns = await Footer.find({ isGlobal: { $ne: true } }).sort({ order: 1 }).lean();
          const response = NextResponse.json(columns);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// GET FOOTER GLOBAL SETTINGS
export const getFooterGlobalSettings = async (req) => {
     try {
          await connectDB();
          let settings = await Footer.findOne({ isGlobal: true }).lean();
          if (!settings) {
               const newSettings = new Footer({
                    isGlobal: true,
                    navigation: [
                         { itemname: "Home", itempath: "/" },
                         { itemname: "Blogs", itempath: "/category/blogs" },
                         { itemname: "Courses", itempath: "/courses" },
                         { itemname: "About us", itempath: "/about-us" },
                         { itemname: "Disclaimer", itempath: "/disclaimer" },
                         { itemname: "Privacy Policy", itempath: "/privacy-policy" },
                         { itemname: "Contact us", itempath: "/contact-us" }
                    ],
                    socials: [
                         { icon: "FaFacebookF", path: "#" },
                         { icon: "RiTwitterXLine", path: "#" },
                         { icon: "FaInstagram", path: "#" },
                         { icon: "FaLinkedinIn", path: "#" },
                         { icon: "CiYoutube", path: "#" }
                    ],
                    card: {
                         title: "Let's build something great together",
                         buttonName: "Get in touch"
                    },
                    buttonname: "Refer & Earn",
                    buttontitle: "Follow us!",
                    copyright: "© 2026 - Weekend UX All Rights Reserved."
               });
               await newSettings.save();
               settings = newSettings.toObject();
          }
          const response = NextResponse.json(settings);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE FOOTER GLOBAL SETTINGS
export const updateFooterGlobalSettings = async (req) => {
     try {
          await connectDB();
          const { navigation, socials, buttonname, buttontitle, copyright, card } = await req.json();
          const updated = await Footer.findOneAndUpdate(
               { isGlobal: true },
               {
                    navigation: navigation || [],
                    socials: socials || [],
                    buttonname: buttonname || "",
                    buttontitle: buttontitle || "",
                    copyright: copyright || "",
                    card: card || { title: "", buttonName: "" }
               },
               { new: true, upsert: true }
          );
          return NextResponse.json(updated);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// CREATE FOOTER COLUMN
export const createFooterColumn = async (req) => {
     try {
          await connectDB();
          const { title, links, order } = await req.json();
          if (!title) {
               return NextResponse.json({ error: "Title is required" }, { status: 400 });
          }

          const column = new Footer({
               title,
               links: links || [],
               order: order || 0
          });

          await column.save();
          return NextResponse.json(column, { status: 201 });
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// UPDATE FOOTER COLUMN
export const updateFooterColumn = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          const { title, links, order } = await req.json();

          const updated = await Footer.findByIdAndUpdate(
               id,
               { title, links, order },
               { new: true }
          );

          if (!updated) {
               return NextResponse.json({ error: "Footer column not found" }, { status: 404 });
          }

          return NextResponse.json(updated);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// DELETE FOOTER COLUMN
export const deleteFooterColumn = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          const deleted = await Footer.findByIdAndDelete(id);

          if (!deleted) {
               return NextResponse.json({ error: "Footer column not found" }, { status: 404 });
          }

          return NextResponse.json({ success: true, message: "Column deleted successfully" });
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};
