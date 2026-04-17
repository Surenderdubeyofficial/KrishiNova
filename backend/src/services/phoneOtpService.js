import twilio from "twilio";

function createTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  return twilio(accountSid, authToken, {
    accountSid,
  });
}

function getVerifyServiceSid() {
  return process.env.TWILIO_VERIFY_SERVICE_SID || "";
}

function normalizePhoneNumber(phoneNumber) {
  const raw = String(phoneNumber || "").trim();
  if (!raw) return "";

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");

  if (hasPlus && digits) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length > 10) {
    return `+${digits}`;
  }

  return raw;
}

export async function sendPhoneOtp({ phoneNumber }) {
  const client = createTwilioClient();
  const serviceSid = getVerifyServiceSid();
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!client || !serviceSid) {
    return {
      sent: false,
      reason: "Twilio Verify is not configured",
    };
  }

  try {
    await client.verify.v2.services(serviceSid).verifications.create({
      to: normalizedPhoneNumber,
      channel: "sms",
    });
  } catch (error) {
    return {
      sent: false,
      reason: error?.message || "SMS OTP could not be sent",
    };
  }

  return { sent: true, phoneNumber: normalizedPhoneNumber };
}

export async function verifyPhoneOtp({ phoneNumber, code }) {
  const client = createTwilioClient();
  const serviceSid = getVerifyServiceSid();
  const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

  if (!client || !serviceSid) {
    return {
      ok: false,
      reason: "Twilio Verify is not configured",
    };
  }

  try {
    const result = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to: normalizedPhoneNumber,
      code,
    });

    return {
      ok: result.status === "approved",
      status: result.status,
      phoneNumber: normalizedPhoneNumber,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error?.message || "SMS OTP verification failed",
    };
  }
}

export { normalizePhoneNumber };
