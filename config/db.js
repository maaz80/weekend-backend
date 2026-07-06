import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
     throw new Error("Please define the MONGO_URI environment variable inside .env");
}

let cached = global.mongoose;

if (!cached) {
     cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
     if (cached.conn) {
          return cached.conn;
     }

     if (!cached.promise) {
          const opts = {
               bufferCommands: false,
          };

          cached.promise = mongoose.connect(MONGO_URI, opts).then((mongooseInstance) => {
               console.log("MongoDB Connected");
               return mongooseInstance;
          }).catch((err) => {
               console.error("MongoDB connection error:", err);
               cached.promise = null;
               throw err;
          });
     }

     try {
          cached.conn = await cached.promise;
     } catch (error) {
          cached.conn = null;
          throw new Error("Database connection failed");
     }

     return cached.conn;
};

export default connectDB;