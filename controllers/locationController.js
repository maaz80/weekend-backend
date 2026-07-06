import Location from "../models/Location.js";
import connectDB from "../config/db.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

const slugifyText = (value = "") =>
     value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
     || "item";

// ================= GET ALL LOCATIONS =================
export const getLocations = async (req) => {
     try {
          await connectDB();
          const data = await Location.find().sort({ createdAt: -1 }).lean();
          const response = NextResponse.json(data);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= GET SINGLE LOCATION GROUP BY ID =================
export const getLocationById = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          const data = await Location.findById(id).lean();
          if (!data) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }
          const response = NextResponse.json(data);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= CREATE LOCATION GROUP =================
export const createLocation = async (req) => {
     try {
          await connectDB();
          let parsedData = {};

          try {
               const reqClone = req.clone();
               const contentType = req.headers.get("content-type") || "";
               if (contentType.includes("multipart/form-data")) {
                    const formData = await reqClone.formData();
                    const dataStr = formData.get("data");
                    parsedData = dataStr ? JSON.parse(dataStr) : {};
               } else {
                    parsedData = await reqClone.json();
               }
          } catch (e) {
               console.error("Error parsing body in createLocation:", e);
          }

          const title = parsedData.title || "Untitled Location Group";
          const location = new Location({ title, items: [] });
          await location.save();

          return NextResponse.json(location, { status: 201 });
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= UPDATE LOCATION GROUP =================
export const updateLocation = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          let parsedData = {};

          try {
               const reqClone = req.clone();
               const contentType = req.headers.get("content-type") || "";
               if (contentType.includes("multipart/form-data")) {
                    const formData = await reqClone.formData();
                    const dataStr = formData.get("data");
                    parsedData = dataStr ? JSON.parse(dataStr) : {};
               } else {
                    parsedData = await reqClone.json();
               }
          } catch (e) {
               console.error("Error parsing body in updateLocation:", e);
          }

          const title = parsedData.title;
          if (!title) {
               return NextResponse.json({ error: "Title is required" }, { status: 400 });
          }

          const updated = await Location.findByIdAndUpdate(
               id,
               { title },
               { new: true }
          );

          if (!updated) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }

          return NextResponse.json(updated);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= DELETE LOCATION GROUP =================
export const deleteLocation = async (req, { params }) => {
     try {
          await connectDB();
          const { id } = await params;
          const deleted = await Location.findByIdAndDelete(id);
          if (!deleted) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }
          return NextResponse.json({ message: "Deleted" });
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= ADD ITEM TO GROUP =================
export const addItem = async (req, { params }) => {
     try {
          await connectDB();
          const { id, locationId } = await params; // Express to Next mapping: directory is api/locations/[id]/items, so id is locationId
          const finalLocationId = locationId || id;
          const location = await Location.findById(finalLocationId);
          if (!location) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }

          let parsedData = {};
          let imageFile = null;

          try {
               const reqClone = req.clone();
               const contentType = req.headers.get("content-type") || "";
               if (contentType.includes("multipart/form-data")) {
                    const formData = await reqClone.formData();
                    const dataStr = formData.get("data");
                    parsedData = dataStr ? JSON.parse(dataStr) : {};
                    imageFile = formData.get("image");
               } else {
                    parsedData = await reqClone.json();
               }
          } catch (e) {
               console.error("Error parsing body in addItem:", e);
          }

          let imageUrl = parsedData.image?.imageurl || "";
          if (imageFile) {
               imageUrl = await uploadToCloudinary(imageFile, "location");
          }

          const slug = slugifyText(parsedData.slug || parsedData.hero?.[0]?.slug || parsedData.title || "item");

          // Check duplicate slug within this group's items
          const isDuplicate = location.items.some(
               (item) => item.hero && item.hero[0] && item.hero[0].slug === slug
          );
          if (isDuplicate) {
               return NextResponse.json({ error: "Item slug already exists in this location group" }, { status: 400 });
          }

          const newItem = {
               hero: [{
                    title: parsedData.title || parsedData.hero?.[0]?.title || "",
                    seotitle: parsedData.seoTitle || parsedData.hero?.[0]?.seotitle || "",
                    seodescription: parsedData.seoDescription || parsedData.hero?.[0]?.seodescription || "",
                    slug: slug,
                    heading: parsedData.heroHeading || parsedData.hero?.[0]?.heading || "",
                    buttonName: parsedData.heroButton || parsedData.hero?.[0]?.buttonName || ""
               }],
               content: parsedData.content || "",
               image: {
                    imageurl: imageUrl,
                    alt: parsedData.imageAlt || parsedData.image?.alt || ""
               },
               relatedBlogs: {
                    title: parsedData.relatedBlogs?.title || parsedData.relatedTitle || "",
                    startheading: parsedData.relatedBlogs?.startheading || parsedData.relatedStart || "",
                    midheading: parsedData.relatedBlogs?.midheading || parsedData.relatedMid || "",
                    endheading: parsedData.relatedBlogs?.endheading || parsedData.relatedEnd || "",
                    description: parsedData.relatedBlogs?.description || parsedData.relatedDesc || ""
               },
               faq: parsedData.faq || { title: "", startheading: "", midheading: "", endheading: "", description: "", items: [] }
          };

          location.items.push(newItem);
          await location.save();

          return NextResponse.json(location);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= GET SINGLE ITEM =================
export const getItem = async (req, { params }) => {
     try {
          await connectDB();
          const { id, locationId, itemId } = await params;
          const finalLocationId = locationId || id;
          const location = await Location.findById(finalLocationId).lean();
          if (!location) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }

          const item = location.items.find(it => it._id && it._id.toString() === itemId);
          if (!item) {
               return NextResponse.json({ error: "Item not found" }, { status: 404 });
          }

          const response = NextResponse.json(item);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= UPDATE ITEM =================
export const updateItem = async (req, { params }) => {
     try {
          await connectDB();
          const { id, locationId, itemId } = await params;
          const finalLocationId = locationId || id;
          const location = await Location.findById(finalLocationId);
          if (!location) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }

          const itemIndex = location.items.findIndex(
               (it) => it._id.toString() === itemId
          );
          if (itemIndex === -1) {
               return NextResponse.json({ error: "Item not found" }, { status: 404 });
          }

          let parsedData = {};
          let imageFile = null;

          try {
               const reqClone = req.clone();
               const contentType = req.headers.get("content-type") || "";
               if (contentType.includes("multipart/form-data")) {
                    const formData = await reqClone.formData();
                    const dataStr = formData.get("data");
                    parsedData = dataStr ? JSON.parse(dataStr) : {};
                    imageFile = formData.get("image");
               } else {
                    parsedData = await reqClone.json();
               }
          } catch (e) {
               console.error("Error parsing body in updateItem:", e);
          }

          let imageUrl = parsedData.image?.imageurl || location.items[itemIndex].image?.imageurl || "";
          if (imageFile) {
               imageUrl = await uploadToCloudinary(imageFile, "location");
          }

          const slug = slugifyText(parsedData.slug || parsedData.hero?.[0]?.slug || parsedData.title || location.items[itemIndex].hero?.[0]?.slug || "item");

          // Check duplicate slug (excluding self)
          const isDuplicate = location.items.some(
               (item, index) => index !== itemIndex && item.hero && item.hero[0] && item.hero[0].slug === slug
          );
          if (isDuplicate) {
               return NextResponse.json({ error: "Item slug already exists in this location group" }, { status: 400 });
          }

          const updatedItem = {
               _id: itemId,
               hero: [{
                    title: parsedData.title || parsedData.hero?.[0]?.title || location.items[itemIndex].hero?.[0]?.title || "",
                    seotitle: parsedData.seoTitle || parsedData.hero?.[0]?.seotitle || location.items[itemIndex].hero?.[0]?.seotitle || "",
                    seodescription: parsedData.seoDescription || parsedData.hero?.[0]?.seodescription || location.items[itemIndex].hero?.[0]?.seodescription || "",
                    slug: slug,
                    heading: parsedData.heroHeading || parsedData.hero?.[0]?.heading || location.items[itemIndex].hero?.[0]?.heading || "",
                    buttonName: parsedData.heroButton || parsedData.hero?.[0]?.buttonName || location.items[itemIndex].hero?.[0]?.buttonName || ""
               }],
               content: parsedData.content !== undefined ? parsedData.content : location.items[itemIndex].content,
               image: {
                    imageurl: imageUrl,
                    alt: parsedData.imageAlt || parsedData.image?.alt || location.items[itemIndex].image?.alt || ""
               },
               relatedBlogs: {
                    title: parsedData.relatedBlogs?.title || parsedData.relatedTitle || location.items[itemIndex].relatedBlogs?.title || "",
                    startheading: parsedData.relatedBlogs?.startheading || parsedData.relatedStart || location.items[itemIndex].relatedBlogs?.startheading || "",
                    midheading: parsedData.relatedBlogs?.midheading || parsedData.relatedMid || location.items[itemIndex].relatedBlogs?.midheading || "",
                    endheading: parsedData.relatedBlogs?.endheading || parsedData.relatedEnd || location.items[itemIndex].relatedBlogs?.endheading || "",
                    description: parsedData.relatedBlogs?.description || parsedData.relatedDesc || location.items[itemIndex].relatedBlogs?.description || ""
               },
               faq: parsedData.faq !== undefined ? parsedData.faq : location.items[itemIndex].faq
          };

          location.items[itemIndex] = updatedItem;
          await location.save();

          return NextResponse.json(location);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= DELETE ITEM =================
export const deleteItem = async (req, { params }) => {
     try {
          await connectDB();
          const { id, locationId, itemId } = await params;
          const finalLocationId = locationId || id;
          const location = await Location.findById(finalLocationId);
          if (!location) {
               return NextResponse.json({ error: "Location group not found" }, { status: 404 });
          }

          const itemIndex = location.items.findIndex(
               (it) => it._id.toString() === itemId
          );
          if (itemIndex === -1) {
               return NextResponse.json({ error: "Item not found" }, { status: 404 });
          }

          location.items.splice(itemIndex, 1);
          await location.save();

          return NextResponse.json(location);
     } catch (err) {
          return NextResponse.json({ error: err.message }, { status: 500 });
     }
};

// ================= GET SINGLE LOCATION ITEM BY SLUG / ID (FOR USER DISPATCHER) =================
export const getLocationItemBySlug = async (req, { params }) => {
     try {
          await connectDB();
          const { idOrSlug } = await params;

          const locationDoc = await Location.findOne({
               "items.hero.slug": idOrSlug
          }).select("items").lean();

          if (!locationDoc) {
               return NextResponse.json({ error: "Location item not found" }, { status: 404 });
          }

          const item = locationDoc.items.find(
               (it) => it.hero && it.hero[0] && it.hero[0].slug === idOrSlug
          );

          if (!item) {
               return NextResponse.json({ error: "Location item not found" }, { status: 404 });
          }

          const response = NextResponse.json(item);
          // response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
          return response;
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
