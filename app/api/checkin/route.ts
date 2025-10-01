import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { localWindowUTC, haversineMeters } from "@/lib/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });
  }
  const uid = user.id;

  const { data: profile } = await supabaseService
    .from("profiles")
    .select("tz,home_lat,home_lng")
    .eq("user_id", uid)
    .single();
  const { data: schedule } = await supabaseService
    .from("schedules")
    .select("wake_time_local,grace_min,active_everyday,active_effective_local_date")
    .eq("user_id", uid)
    .single();

  if (!profile || !schedule) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 400 });
  }

  const tz = profile.tz || "UTC";

  if (!schedule.active_everyday) {
    return NextResponse.json({ ok: false, error: "inactive", message: "WakeStake is paused." }, { status: 400 });
  }

  const todayLocal = dayjs().tz(tz).format("YYYY-MM-DD");

  if (schedule.active_effective_local_date && todayLocal < schedule.active_effective_local_date) {
    const resumeDisplay = dayjs.tz(schedule.active_effective_local_date, tz).format("MMM D");
    return NextResponse.json(
      { ok: false, error: "inactive_today", message: `WakeStake resumes on ${resumeDisplay}.` },
      { status: 400 }
    );
  }
  const windowUtc = localWindowUTC(tz, todayLocal, schedule.wake_time_local, schedule.grace_min || 15);
  const nowUtc = dayjs().utc();

  if (nowUtc.isBefore(windowUtc.startUtc)) {
    return NextResponse.json(
      {
        ok: false,
        error: "too_early",
        message: `Window starts at ${dayjs(windowUtc.startUtc).tz(tz).format("HH:mm")}`,
      },
      { status: 400 },
    );
  }

  if (nowUtc.isAfter(windowUtc.endUtc)) {
    return NextResponse.json(
      { ok: false, error: "too_late", message: "Deadline passed" },
      { status: 400 },
    );
  }

  const inserted = await supabaseService
    .from("checkins")
    .insert({ user_id: uid, lat, lng, accuracy_m: accuracy })
    .select("id")
    .single()
    .throwOnError();
  const checkinId = inserted.data.id;

  const existing = await supabaseService
    .from("evaluations")
    .select("status")
    .eq("user_id", uid)
    .eq("local_date", todayLocal)
    .maybeSingle();
  if (existing.data?.status === "success") {
    return NextResponse.json({ ok: true, status: "success", message: "Already done for today." });
  }

  let status: "success" | "violation" = "violation";
  let reason: string | undefined;

  if (accuracy <= ACC_MAX) {
    const distance = haversineMeters(profile.home_lat, profile.home_lng, lat, lng);
    if (distance > DIST) {
      status = "success";
    } else {
      reason = `You are still within ${Math.round(DIST)} m of home`;
    }
  } else {
    reason = `Low location accuracy (> ${ACC_MAX} m)`;
  }

  if (status === "success") {
    await supabaseService
      .from("evaluations")
      .upsert({
        user_id: uid,
        local_date: todayLocal,
        status: "success",
        checkin_id: checkinId,
      }, { onConflict: "user_id,local_date" })
      .throwOnError();

    const streak = await supabaseService
      .from("streaks")
      .select("current_streak,longest_streak")
      .eq("user_id", uid)
      .maybeSingle();

    const current = (streak.data?.current_streak || 0) + 1;
    const longest = Math.max(current, streak.data?.longest_streak || 0);

    await supabaseService
      .from("streaks")
      .upsert({
        user_id: uid,
        current_streak: current,
        longest_streak: longest,
        updated_for_date: todayLocal,
      });

    return NextResponse.json({ ok: true, status: "success", message: "Checked out. You're done for today." });
  }

  return NextResponse.json(
    { ok: false, error: "not_outside", message: reason || "Not enough distance" },
    { status: 400 },
  );
}


