import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseService } from "@/lib/supabase-server";

export async function POST(req:NextRequest){
  const sig = req.headers.get("stripe-signature")!;
  const buf = Buffer.from(await req.arrayBuffer());
  let event;
  try{
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  }catch(e:any){ return new NextResponse(`Webhook Error: ${e.message}`, { status: 400 }); }

  switch(event.type){
    case "checkout.session.completed": {
      const s = event.data.object as any;
      const customer = s.customer as string;
      const subscription = s.subscription as string;
      const userId = (await stripe.customers.retrieve(customer)) as any;
      const uid = userId?.metadata?.user_id || null;
      if(uid){
        await supabaseService.from("billing").upsert({ user_id: uid, stripe_customer_id: customer, stripe_subscription_id: subscription }).throwOnError();
      }
      break;
    }
    case "customer.subscription.deleted":
      // 自動停止
      break;
  }
  return NextResponse.json({received:true});
}
