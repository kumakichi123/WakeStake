import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { localWindowUTC, haversineMeters } from "@/lib/utils";
import { stripe, PRICE_ID } from "@/lib/stripe";
import { sendViolationEmail } from "@/lib/mailer";
import dayjs from "dayjs";

const DIST = Number(process.env.NEXT_PUBLIC_DISTANCE_THRESHOLD_M || 70);
const ACC_MAX = Number(process.env.NEXT_PUBLIC_ACCURACY_MAX_M || 30);

export async function GET(req:NextRequest){
  const auth = req.headers.get("authorization");
  if(auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"forbidden"},{status:403});

  // 対象ユーザーを取得
  const { data: users, error } = await supabaseService.rpc("get_candidates_for_now"); // 使わない場合は下で全件に変更
  // Fallback: 全ユーザー走査（小規模前提）
  const { data: profiles } = await supabaseService.from("profiles").select("user_id,tz,home_lat,home_lng");
  const { data: schedules } = await supabaseService.from("schedules").select("user_id,wake_time_local,grace_min,active_everyday");

  const map = new Map<string, any>();
  (profiles||[]).forEach(p=>map.set(p.user_id, { ...p }));
  (schedules||[]).forEach(s=>map.set(s.user_id, { ...(map.get(s.user_id)||{}), ...s }));

  const todayISO = dayjs().format("YYYY-MM-DD");
  let processed=0, violations=0;

  for(const [uid, row] of map){
    if(!row?.active_everyday) continue;
    // 既に評価済みならskip
    const ex = await supabaseService.from("evaluations").select("id").eq("user_id", uid).eq("local_date", todayISO).maybeSingle();
    if(ex.data) continue;

    const win = localWindowUTC(row.tz, todayISO, row.wake_time_local, row.grace_min||15);

    // window内の最新checkin取得
    const { data: ci } = await supabaseService.from("checkins")
      .select("*").eq("user_id", uid).gte("ts_utc", win.startUtc.toISOString()).lte("ts_utc", win.endUtc.toISOString())
      .order("ts_utc",{ascending:false}).limit(1);

    let status:"success"|"violation" = "violation";
    let usedCheckinId: number | null = null;

    if(ci && ci.length>0){
      const c = ci[0] as any;
      usedCheckinId = c.id;
      if(c.accuracy_m <= ACC_MAX){
        const d = haversineMeters(row.home_lat, row.home_lng, c.lat, c.lng);
        if(d > DIST) status = "success";
      }
    }

    const ins = await supabaseService.from("evaluations").insert({
      user_id: uid, local_date: todayISO, status, checkin_id: usedCheckinId
    }).select().single().throwOnError();

    // streak更新
    const stPrev = await supabaseService.from("streaks").select("*").eq("user_id", uid).maybeSingle();
    let cur = stPrev.data?.current_streak || 0;
    let longest = stPrev.data?.longest_streak || 0;
    if(status === "success"){ cur=cur+1; if(cur>longest) longest=cur; }
    else { cur=0; }
    await supabaseService.from("streaks").upsert({ user_id: uid, current_streak: cur, longest_streak: longest, updated_for_date: todayISO });

    if(status === "violation"){
      violations++;
      // 課金（usage record）
      const st = await supabaseService.from("stakes").select("stake_usd").eq("user_id", uid).single();
      const bill = await supabaseService.from("billing").select("stripe_subscription_id").eq("user_id", uid).single();
      const amount = st.data?.stake_usd || 1;
      if(bill.data?.stripe_subscription_id){
        try{
          const u = await stripe.subscriptionItems.list({ subscription: bill.data.stripe_subscription_id, limit:1 });
          const itemId = u.data[0].id;
          const usage = await stripe.subscriptionItems.createUsageRecord(itemId, {
            quantity: amount, action: "increment", timestamp: Math.floor(Date.now()/1000)
          });
          await supabaseService.from("charges").insert({
            user_id: uid, evaluation_id: ins.data.id, stripe_usage_record_id: usage.id, amount_usd: amount
          });
        }catch(e){
          // 失敗時は課金レコード作らない。後続で再試行可能。
        }
      }
      // メール通知（失敗時のみ）
      const { data: u } = await supabaseService.from("auth.users").select("email").eq("id", uid).maybeSingle() as any;
      if(u?.email){ try{ await sendViolationEmail(u.email, todayISO, amount); }catch{} }
    }

    processed++;
  }

  return NextResponse.json({ ok:true, processed, violations });
}
