import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { fetchAgricultureNews } from "../services/newsService.js";
import { fetchWeatherForecast } from "../services/weatherService.js";
import { createCheckoutUrl } from "../services/stripeService.js";
import { createRazorpayOrder, verifyRazorpayPayment } from "../services/razorpayService.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { sendContactEmail } from "../services/mailService.js";

const router = Router();

router.get(
  "/news",
  asyncHandler(async (req, res) => {
    const data = await fetchAgricultureNews(req.query.q || "farmers");
    res.json(data);
  }),
);

router.get(
  "/weather",
  asyncHandler(async (req, res) => {
    const city = req.query.city;
    if (!city) {
      return res.status(400).json({ message: "City is required" });
    }

    const data = await fetchWeatherForecast(city);
    res.json(data);
  }),
);

router.post(
  "/contact-email",
  asyncHandler(async (req, res) => {
    const result = await sendContactEmail(req.body);
    res.json(result);
  }),
);

router.post(
  "/checkout-session",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const { crop, quantity, unitAmount } = req.body;
    if (!crop || !quantity || !unitAmount) {
      return res.status(400).json({ message: "Crop, quantity, and unit amount are required" });
    }

    const data = await createCheckoutUrl({ crop, quantity, unitAmount });
    res.json(data);
  }),
);

router.post(
  "/razorpay/order",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const { crop, quantity, unitAmount } = req.body;
    if (!crop || !quantity || !unitAmount) {
      return res.status(400).json({ message: "Crop, quantity, and unit amount are required" });
    }

    const data = await createRazorpayOrder({ crop, quantity, unitAmount });
    if (!data.configured) {
      return res.status(400).json({ message: data.message || "Razorpay is unavailable" });
    }

    res.json(data);
  }),
);

router.post(
  "/razorpay/verify",
  requireAuth,
  requireRole("customer"),
  asyncHandler(async (req, res) => {
    const {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Razorpay payment details are required" });
    }

    const verified = verifyRazorpayPayment({ orderId, paymentId, signature });
    if (!verified) {
      return res.status(400).json({ message: "Razorpay payment verification failed" });
    }

    res.json({ verified: true, message: "Payment verified successfully" });
  }),
);

export default router;
