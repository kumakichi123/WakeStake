import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { localWindowUTC, haversineMeters } from "@/lib/utils";
import dayjs from "dayjs";

const DIST = Number(process.env.NEXT_PUBLIC_DISTANCE_THRESHOLD_M || 70);
const ACC_MAX = Number(process.env.NEXT_PUBLIC_ACCURACY_MAX_M || 30);

export async function POST(req: NextRequest) {
  const { lat, lng, accuracy } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number" || typeof accuracy !== "number") {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseService.auth.getUser(jwt);
  if (!user) return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });
  const uid = user.id;

  // ユーザー設定を取得
  const { data: prof } = await supabaseService.from("profiles").select("tz,home_lat,home_lng").eq("user_id", uid).single();
  const { data: sch }  = await supabaseService.from("schedules").select("wake_time_local,grace_min,active_everyday").eq("user_id", uid).single();
  if (!prof || !sch || !sch.active_everyday) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  }

  const todayLocal = dayjs().tz(prof.tz).format("YYYY-MM-DD");
  const win = localWindowUTC(prof.tz, todayLocal, sch.wake_time_local, sch.grace_min || 15);
  const now = new Date();

  // 時間外なら即エラーを返す（位置情報チェックなし）
  if (now < win.startUtc) {
    return NextResponse.json({
      ok: false,
      error: "too_early",
      message: `Window starts at ${dayjs(win.startUtc).tz(prof.tz).format("HH:mm")}`,
    }, { status: 400 });
  }
  if (now > win.endUtc) {
    return NextResponse.json({ ok: false, error: "too_late", message: "Deadline passed" }, { status: 400 });
  }

  // チェックインを保存
  const ins = await supabaseService.from("checkins").insert({
    user_id: uid, lat, lng, accuracy_m: accuracy,
  }).select("id").single().throwOnError();
  const checkinId = ins.data.id;

  // 既に当日成功済みなら成功を返すだけで終了（重複課金防止）
  const already = await supabaseService.from("evaluations")
    .select("id,status").eq("user_id", uid).eq("local_date", todayLocal).maybeSingle();
  if (already.data?.status === "success") {
    return NextResponse.json({ ok: true, status: "success", message: "Already done for today." });
  }

  // その場で判定
  let status: "success" | "violation" = "violation";
  let reason: string | undefined;

  if (accuracy <= ACC_MAX) {
    const d = haversineMeters(prof.home_lat, prof.home_lng, lat, lng);
    if (d > DIST) status = "success";
    else reason = `You are still within ${Math.round(DIST)} m of home`;
  } else {
    reason = `Low location accuracy (> ${ACC_MAX} m)`;
  }

  if (status === "success") {
    // 当日の evaluation を即確定
    const ev = await supabaseService.from("evaluations").upsert({
      user_id: uid, local_date: todayLocal, status: "success", checkin_id: checkinId,
    }, { onConflict: "user_id,local_date" }).select().single().throwOnError();

    // ストリーク更新
    const stPrev = await supabaseService.from("streaks").select("*").eq("user_id", uid).maybeSingle();
    const cur = (stPrev.data?.current_streak || 0) + 1;
    const longest = Math.max(cur, stPrev.data?.longest_streak || 0);
    await supabaseService.from("streaks").upsert({ user_id: uid, current_streak: cur, longest_streak: longest, updated_for_date: todayLocal });

    return NextResponse.json({ ok: true, status: "success", message: "Checked out. You're done for today." });
  }

  // 成功でなければ cron が違反を確定する
  return NextResponse.json({ ok: false, error: "not_outside", message: reason || "Not enough distance" }, { status: 400 });
}
