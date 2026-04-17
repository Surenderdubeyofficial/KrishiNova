import crypto from "crypto";
import Razorpay from "razorpay";

function getCredentials() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

function getRazorpayClient() {
  const credentials = getCredentials();
  if (!credentials) {
    return null;
  }

  return new Razorpay({
    key_id: credentials.keyId,
    key_secret: credentials.keySecret,
  });
}

export async function createRazorpayOrder({ crop, quantity, unitAmount }) {
  const credentials = getCredentials();
  const razorpay = getRazorpayClient();

  if (!credentials || !razorpay) {
    return {
      configured: false,
      message: "Razorpay is not configured yet",
    };
  }

  const normalizedQuantity = Number(quantity);
  const normalizedUnitAmount = Number(unitAmount);
  const amount = Math.round(normalizedQuantity * normalizedUnitAmount * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      configured: false,
      message: "Invalid order amount",
    };
  }

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: `crop_${Date.now()}`,
    notes: {
      crop,
      quantity: String(normalizedQuantity),
    },
  });

  return {
    configured: true,
    keyId: credentials.keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
  };
}

export function verifyRazorpayPayment({ orderId, paymentId, signature }) {
  const credentials = getCredentials();
  if (!credentials) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", credentials.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return expectedSignature === signature;
}
