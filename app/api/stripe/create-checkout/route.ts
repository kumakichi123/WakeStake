import { NextResponse } from "next/server";
import { stripe, PRICE_ID } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase-server";

export async function POST(req:Request){
  const auth = req.headers.get("Authorization")||"";
  const jwt = auth.replace("Bearer ","");
  const { data: { user } } = await supabaseService.auth.getUser(jwt);
  if(!user) return NextResponse.json({error:"unauth"},{status:401});

  // 鬘ｧ螳｢
  const { data: b } = await supabaseService.from("billing").select("*").eq("user_id", user.id).maybeSingle();
  let customerId = b?.stripe_customer_id;
  if(!customerId){
    const c = await stripe.customers.create({ email: user.email || undefined, metadata:{ user_id: user.id }});
    customerId = c.id;
    await supabaseService.from("billing").upsert({ user_id: user.id, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode:"subscription",
    customer: customerId,
    line_items:[{ price: PRICE_ID }],
    success_url: `${new URL(req.url).origin}/onboarding?ok=1`,
    cancel_url: `${new URL(req.url).origin}/onboarding?cancel=1`,
    allow_promotion_codes: false,
  });
  return NextResponse.json({ url: session.url });
}

