// lib/stripe.ts
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

const priceId = process.env.STRIPE_PRICE_METERED_ID;
if (!priceId) {
  throw new Error("STRIPE_PRICE_METERED_ID is not set");
}

export const PRICE_ID = priceId;
