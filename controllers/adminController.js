import crypto from "crypto";
import { createAdminToken } from "../middleware/adminAuth.js";
import { NextResponse } from "next/server";

const safeCompare = (receivedValue, expectedValue) => {
     const received = Buffer.from(receivedValue || "");
     const expected = Buffer.from(expectedValue || "");

     if (received.length !== expected.length) {
          return false;
     }

     return crypto.timingSafeEqual(received, expected);
};

export const loginAdmin = async (req) => {
     try {
          const { username, password } = await req.json();
          const adminUsername = process.env.ADMIN_USERNAME;
          const adminPassword = process.env.ADMIN_PASSWORD;

          if (!adminUsername || !adminPassword) {
               return NextResponse.json({ error: "Admin login is not configured." }, { status: 503 });
          }

          if (!safeCompare(username, adminUsername) || !safeCompare(password, adminPassword)) {
               return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
          }

          const token = createAdminToken();

          return NextResponse.json({
               token,
               expiresIn: 30 * 24 * 60 * 60
          });
     } catch (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};
