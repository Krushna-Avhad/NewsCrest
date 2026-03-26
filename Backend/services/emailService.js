// services/emailService.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendAlertEmail = async (email, message) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "🚨 News Alert",
    text: message,
  });
};