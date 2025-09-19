// lib/mailer.ts
import nodemailer from "nodemailer";
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!, port: Number(process.env.SMTP_PORT||587), secure: false,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }
});
export async function sendViolationEmail(to:string, localDate:string, amountUSD:number){
  const from = process.env.MAIL_FROM || "WakeStake <no-reply@wakestake.app>";
  const subject = `You missed your wake time on ${localDate}`;
  const text = `WakeStake: You did not check out by your deadline. $${amountUSD} will be added to your monthly invoice.`;
  await transporter.sendMail({ from, to, subject, text });
}
