import { transporter } from "../config/mailer.js";
import { NextResponse } from "next/server";

export const sendBooking = async (req) => {
     try {
          const { fullName, phone, email, message } = await req.json();

          await transporter.sendMail({
               from: process.env.EMAIL_FROM,
               to: process.env.EMAIL_TO,
               subject: "New Booking Request - Weekend UX",
               html: `
                    <h2>New Booking Request</h2>
                    <table border="1" style="border-collapse:collapse">
                         <tr>
                              <td><b>Full Name</b></td>
                              <td>${fullName}</td>
                         </tr>
                         <tr>
                              <td><b>Phone</b></td>
                              <td>${phone}</td>
                         </tr>
                         <tr>
                              <td><b>Email</b></td>
                              <td>${email}</td>
                         </tr>
                         <tr>
                              <td><b>Message</b></td>
                              <td>${message}</td>
                         </tr>
                    </table>
               `
          });

          return NextResponse.json({ success: true });
     } catch (error) {
          console.error(error);
          return NextResponse.json({ error: error.message }, { status: 500 });
     }
};