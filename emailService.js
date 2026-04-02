import nodemailer from "nodemailer";
import dotenv from "dotenv";

// ✅ LOAD ENV HERE ALSO (VERY IMPORTANT)
dotenv.config();

// 🔍 DEBUG
console.log("EMAIL_USER (emailService):", process.env.EMAIL_USER);
console.log("EMAIL_PASS (emailService):", process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ VERIFY CONNECTION
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email server error:", error);
  } else {
    console.log("✅ Email server is ready");
  }
});

// SEND OTP
export const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify Your Email",
    html: `
      <h2>Your OTP is:</h2>
      <h1>${otp}</h1>
      <p>Valid for 10 minutes</p>
    `
  });
}; 