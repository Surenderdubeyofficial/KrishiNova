import Stripe from "stripe";

function getStripeClient() {
  const secretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!secretKey || /xxx/i.test(secretKey)) {
    return null;
  }

  return new Stripe(secretKey);
}

export async function createCheckoutUrl({ crop, quantity, unitAmount }) {
  const stripe = getStripeClient();
  if (!stripe) {
    return {
      configured: false,
      url: null,
      message: "Stripe payment is not configured yet",
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `${crop} purchase`,
              description: `Agriculture Portal crop purchase for ${quantity} kg`,
            },
            unit_amount: Number(unitAmount) * 100,
          },
          quantity: Number(quantity),
        },
      ],
      success_url: `${process.env.STRIPE_SUCCESS_URL}&crop=${encodeURIComponent(crop)}&quantity=${quantity}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });

    return {
      configured: true,
      url: session.url,
    };
  } catch (_error) {
    return {
      configured: false,
      url: null,
      message: "Stripe payment is unavailable right now",
    };
  }
}
