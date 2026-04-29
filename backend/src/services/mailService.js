import nodemailer from "nodemailer";

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendContactEmail({ name, mobile, email, address, message }) {
  const transporter = createTransporter();
  const recipient = process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER;

  if (!transporter || !recipient) {
    return {
      delivered: false,
      reason: "SMTP is not configured",
    };
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: recipient,
    replyTo: email,
    subject: `Agriculture Portal contact from ${name}`,
    html: `
      <h2>New contact message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Mobile:</strong> ${mobile}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Address:</strong> ${address}</p>
      <p><strong>Message:</strong> ${message}</p>
    `,
  });

  return { delivered: true };
}

export async function sendOtpEmail({ email, otp, role }) {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      delivered: false,
      reason: "SMTP is not configured",
    };
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "OTP Verification",
    html: `
      <h2>Agriculture Portal OTP Verification</h2>
      <p>Your ${role} verification code is <strong>${otp}</strong>.</p>
      <p>Enter this code in the portal to complete login or signup.</p>
    `,
  });

  return { delivered: true };
}
