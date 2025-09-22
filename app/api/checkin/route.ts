import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { localWindowUTC, haversineMeters } from "@/lib/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc); dayjs.extend(timezone);

const DIST = Number(process.env.NEXT_PUBLIC_DISTANCE_THRESHOLD_M || 70);
const ACC_MAX = Number(process.env.NEXT_PUBLIC_ACCURACY_MAX_M || 30);

export async function POST(req: NextRequest) {
  const { lat, lng, accuracy } = await req.json();
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof accuracy !== "number"
  ) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseService.auth.getUser(jwt);
  if (!user) return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });
  const uid = user.id;

  // ユーザー設定
  const { data: prof } = await supabaseService
    .from("profiles")
    .select("tz,home_lat,home_lng")
    .eq("user_id", uid)
    .single();
  const { data: sch } = await supabaseService
    .from("schedules")
    .select("wake_time_local,grace_min,active_everyday")
    .eq("user_id", uid)
    .single();

  if (!prof || !sch || !sch.active_everyday || !prof.tz) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  }
  if (prof.home_lat == null || prof.home_lng == null) {
    return NextResponse.json({ ok: false, error: "no_home_location" }, { status: 400 });
  }

  const todayLocal = dayjs().tz(prof.tz).format("YYYY-MM-DD");
  const win = localWindowUTC(
    prof.tz,
    todayLocal,
    sch.wake_time_local,
    sch.grace_min || 15
  );
  const now = new Date();

  // ウィンドウ外は弾く
  if (now < win.startUtc) {
    return NextResponse.json(
      {
        ok: false,
        error: "too_early",
        message: `Window starts at ${dayjs(win.startUtc).tz(prof.tz).format("HH:mm")}`,
      },
      { status: 400 }
    );
  }
  if (now > win.endUtc) {
    return NextResponse.json(
      { ok: false, error: "too_late", message: "Deadline passed" },
      { status: 400 }
    );
  }

  // チェックイン保存
  const ins = await supabaseService
    .from("checkins")
    .insert({
      user_id: uid,
      lat,
      lng,
      accuracy_m: accuracy,
      ts_utc: new Date().toISOString(),
    })
    .select("id")
    .single()
    .throwOnError();
  const checkinId = ins.data.id;

  // 当日成功済みなら終了（ユーザーTZ基準）
  const already = await supabaseService
    .from("evaluations")
    .select("id,status")
    .eq("user_id", uid)
    .eq("local_date", todayLocal)
    .maybeSingle();
  if (already.data?.status === "success") {
    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Already done for today.",
    });
  }

  // その場で判定
  let status: "success" | "violation" = "violation";
  let reason: string | undefined;

  if (accuracy <= ACC_MAX) {
    const d = haversineMeters(prof.home_lat, prof.home_lng, lat, lng);
    if (d > DIST) status = "success";
    else reason = `Within ${Math.round(DIST)} m of home`;
  } else {
    reason = `Low accuracy (> ${ACC_MAX} m)`;
  }

  if (status === "success") {
    // 当日evaluationを即確定（evaluated_at_utc付与）
    await supabaseService
      .from("evaluations")
      .upsert(
        {
          user_id: uid,
          local_date: todayLocal,
          status: "success",
          checkin_id: checkinId,
          evaluated_at_utc: new Date().toISOString(),
        },
        { onConflict: "user_id,local_date" }
      )
      .select()
      .single()
      .throwOnError();

    // streak更新
    const stPrev = await supabaseService
      .from("streaks")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    const cur = (stPrev.data?.current_streak || 0) + 1;
    const longest = Math.max(cur, stPrev.data?.longest_streak || 0);
    await supabaseService
      .from("streaks")
      .upsert({
        user_id: uid,
        current_streak: cur,
        longest_streak: longest,
        updated_for_date: todayLocal,
      })
      .throwOnError();

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Checked out. You're done for today.",
    });
  }

  // 成功でなければ評価は作らない（再挑戦可）
  return NextResponse.json(
    { ok: false, error: "not_outside", message: reason || "Not enough distance" },
    { status: 400 }
  );
}
