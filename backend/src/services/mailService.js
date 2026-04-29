import nodemailer from "nodemailer";

const DEFAULT_SMTP_TIMEOUT_MS = 15000;
const DEFAULT_HTTP_TIMEOUT_MS = 15000;

function getTimeout(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function getResendConfig() {
  return {
    apiKey: String(process.env.RESEND_API_KEY || "").trim(),
    fromEmail: String(process.env.RESEND_FROM_EMAIL || "").trim(),
    timeoutMs: getTimeout(process.env.RESEND_TIMEOUT_MS, DEFAULT_HTTP_TIMEOUT_MS),
  };
}

function hasResendConfig() {
  const { apiKey, fromEmail } = getResendConfig();
  return Boolean(apiKey && fromEmail);
}

function getSmtpTimeout() {
  return getTimeout(process.env.SMTP_TIMEOUT_MS, DEFAULT_SMTP_TIMEOUT_MS);
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

async function sendViaResend(message) {
  const { apiKey, fromEmail, timeoutMs } = getResendConfig();

  try {
    const response = await withTimeout(
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: Array.isArray(message.to) ? message.to : [message.to],
          reply_to: message.replyTo || undefined,
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      }),
      timeoutMs,
      "Resend send",
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        delivered: false,
        reason:
          data?.message ||
          data?.error ||
          `Resend request failed with status ${response.status}`,
      };
    }

    return {
      delivered: true,
      provider: "resend",
      messageId: data?.id || null,
    };
  } catch (error) {
    return {
      delivered: false,
      reason: error?.message || "Resend delivery failed",
    };
  }
}

async function sendViaSmtp(message, missingReason = "SMTP is not configured") {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      delivered: false,
      reason: missingReason,
    };
  }

  try {
    const info = await withTimeout(transporter.sendMail(message), getSmtpTimeout(), "SMTP send");
    return {
      delivered: true,
      provider: "smtp",
      messageId: info?.messageId || null,
    };
  } catch (error) {
    return {
      delivered: false,
      reason: error?.message || "Email delivery failed",
    };
  }
}

async function sendEmail(message, missingReason = "Mail delivery is not configured") {
  if (hasResendConfig()) {
    return sendViaResend(message);
  }

  return sendViaSmtp(message, missingReason);
}

export async function sendContactEmail({ name, mobile, email, address, message }) {
  const recipient =
    String(process.env.CONTACT_RECEIVER_EMAIL || "").trim() ||
    String(process.env.RESEND_FROM_EMAIL || "").trim() ||
    String(process.env.SMTP_USER || "").trim();

  if (!recipient) {
    return {
      delivered: false,
      reason: "Mail delivery is not configured",
    };
  }

  return sendEmail({
    from: process.env.SMTP_USER || process.env.RESEND_FROM_EMAIL,
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
    from: process.env.SMTP_USER || process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "OTP Verification",
    html: `
      <h2>Agriculture Portal OTP Verification</h2>
      <p>Your ${role} verification code is <strong>${otp}</strong>.</p>
      <p>Enter this code in the portal to complete login or signup.</p>
    `,
  });
}
