import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { localWindowUTC, haversineMeters } from "@/lib/utils";
import { stripe } from "@/lib/stripe";
import { sendViolationEmail } from "@/lib/mailer";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc); dayjs.extend(timezone);

const DIST = Number(process.env.NEXT_PUBLIC_DISTANCE_THRESHOLD_M || 70);
const ACC_MAX = Number(process.env.NEXT_PUBLIC_ACCURACY_MAX_M || 30);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 対象データ取得
  const { data: profiles } = await supabaseService
    .from("profiles")
    .select("user_id,tz,home_lat,home_lng");

  const { data: schedules } = await supabaseService
    .from("schedules")
    .select("user_id,wake_time_local,grace_min,active_everyday");

  const map = new Map<string, any>();
  (profiles || []).forEach((p) => map.set(p.user_id, { ...p }));
  (schedules || []).forEach((s) =>
    map.set(s.user_id, { ...(map.get(s.user_id) || {}), ...s })
  );

  let processed = 0;
  let violations = 0;

  const nowUtc = new Date();

  for (const [uid, row] of map) {
    // 必須設定
    if (!row?.active_everyday) continue;
    if (!row?.tz || row.home_lat == null || row.home_lng == null) continue;
    if (!row?.wake_time_local) continue;

    // ユーザーTZの当日
    const todayLocal = dayjs().tz(row.tz).format("YYYY-MM-DD");

    // 既に評価済みならskip（ユーザーTZの当日）
    const ex = await supabaseService
      .from("evaluations")
      .select("id")
      .eq("user_id", uid)
      .eq("local_date", todayLocal)
      .maybeSingle();
    if (ex.data) continue;

    // 当日の評価ウィンドウ（ユーザーTZ起点）
    const win = localWindowUTC(
      row.tz,
      todayLocal,
      row.wake_time_local,
      row.grace_min || 15
    );

    // まだ締切前なら確定しない
    if (nowUtc < win.endUtc) continue;

    // 窓内の最新チェックイン
    const { data: ci } = await supabaseService
      .from("checkins")
      .select("*")
      .eq("user_id", uid)
      .gte("ts_utc", win.startUtc.toISOString())
      .lte("ts_utc", win.endUtc.toISOString())
      .order("ts_utc", { ascending: false })
      .limit(1);

    let status: "success" | "violation" = "violation";
    let usedCheckinId: number | null = null;

    if (ci && ci.length > 0) {
      const c = ci[0] as any;
      usedCheckinId = c.id;
      if (typeof c.accuracy_m === "number" && c.accuracy_m <= ACC_MAX) {
        const d = haversineMeters(row.home_lat, row.home_lng, c.lat, c.lng);
        if (d > DIST) status = "success";
      }
    }

    // 評価確定（evaluated_at_utc を明示）
    const ins = await supabaseService
      .from("evaluations")
      .insert({
        user_id: uid,
        local_date: todayLocal,
        status,
        checkin_id: usedCheckinId,
        evaluated_at_utc: nowUtc.toISOString(),
      })
      .select()
      .single()
      .throwOnError();

    // streak更新（ユーザーTZの当日で記録）
    const stPrev = await supabaseService
      .from("streaks")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    let cur = stPrev.data?.current_streak || 0;
    let longest = stPrev.data?.longest_streak || 0;
    if (status === "success") {
      cur = cur + 1;
      if (cur > longest) longest = cur;
    } else {
      cur = 0;
    }
    await supabaseService
      .from("streaks")
      .upsert({
        user_id: uid,
        current_streak: cur,
        longest_streak: longest,
        updated_for_date: todayLocal,
      })
      .throwOnError();

    if (status === "violation") {
      violations++;

      // 課金（usage record）
      const st = await supabaseService
        .from("stakes")
        .select("stake_usd")
        .eq("user_id", uid)
        .single();
      const bill = await supabaseService
        .from("billing")
        .select("stripe_subscription_id")
        .eq("user_id", uid)
        .single();
      const amount = st.data?.stake_usd || 1;
      if (bill.data?.stripe_subscription_id) {
        try {
          const u = await stripe.subscriptionItems.list({
            subscription: bill.data.stripe_subscription_id,
            limit: 1,
          });
          const itemId = u.data[0]?.id;
          if (itemId) {
            const usage = await stripe.subscriptionItems.createUsageRecord(
              itemId,
              {
                quantity: amount,
                action: "increment",
                timestamp: Math.floor(Date.now() / 1000),
              }
            );
            await supabaseService.from("charges").insert({
              user_id: uid,
              evaluation_id: ins.data.id,
              stripe_usage_record_id: usage.id,
              amount_usd: amount,
            });
          }
        } catch {
          // 後続で再試行可
        }
      }

      // メール通知（違反時のみ）
      const { data: u } = (await supabaseService
        .from("auth.users")
        .select("email")
        .eq("id", uid)
        .maybeSingle()) as any;
      if (u?.email) {
        try {
          await sendViolationEmail(u.email, todayLocal, amount);
        } catch {}
      }
    }

    processed++;
  }

  return NextResponse.json({ ok: true, processed, violations });
}
