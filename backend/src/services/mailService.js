import nodemailer from "nodemailer";

const DEFAULT_SMTP_TIMEOUT_MS = 15000;

function getSmtpTimeout() {
  const value = Number(process.env.SMTP_TIMEOUT_MS || DEFAULT_SMTP_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_SMTP_TIMEOUT_MS;
}

function withTimeout(promise, label) {
  const timeoutMs = getSmtpTimeout();

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function createTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    connectionTimeout: getSmtpTimeout(),
    greetingTimeout: getSmtpTimeout(),
    socketTimeout: getSmtpTimeout(),
    dnsTimeout: getSmtpTimeout(),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail(message, missingReason = "SMTP is not configured") {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      delivered: false,
      reason: missingReason,
    };
  }

  try {
    await withTimeout(transporter.verify(), "SMTP verification");
  } catch (error) {
    return {
      delivered: false,
      reason: error?.message || "SMTP verification failed",
    };
  }

  try {
    await withTimeout(transporter.sendMail(message), "SMTP send");
    return { delivered: true };
  } catch (error) {
    return {
      delivered: false,
      reason: error?.message || "Email delivery failed",
    };
  }
}

export async function sendContactEmail({ name, mobile, email, address, message }) {
  const recipient = process.env.CONTACT_RECEIVER_EMAIL || process.env.SMTP_USER;

  if (!recipient) {
    return {
      delivered: false,
      reason: "SMTP is not configured",
    };
  }

  return sendEmail({
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
}

export async function sendOtpEmail({ email, otp, role }) {
  return sendEmail({
    from: process.env.SMTP_USER,
    to: email,
    subject: "OTP Verification",
    html: `
      <h2>Agriculture Portal OTP Verification</h2>
      <p>Your ${role} verification code is <strong>${otp}</strong>.</p>
      <p>Enter this code in the portal to complete login or signup.</p>
    `,
  });
}
