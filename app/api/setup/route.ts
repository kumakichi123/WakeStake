import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { tz, home, wake_time, stake_usd, active } = body || {};

  if (
    typeof tz !== "string" ||
    typeof wake_time !== "string" ||
    typeof stake_usd !== "number" ||
    typeof home?.lat !== "number" ||
    typeof home?.lng !== "number"
  ) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userRes } = await supabaseService.auth.getUser(jwt);
  const user = userRes?.user;
  if (!user) {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }
  const uid = user.id;

  const db = supabaseService;

  const { data: scheduleRow, error: scheduleError } = await db
    .from("schedules")
    .select("active_everyday")
    .eq("user_id", uid)
    .maybeSingle();

  if (scheduleError && scheduleError.code !== "PGRST116") {
    return NextResponse.json({ error: scheduleError.message }, { status: 500 });
  }

  const nextActive =
    typeof active === "boolean"
      ? active
      : scheduleRow?.active_everyday ?? true;

  await db
    .from("profiles")
    .upsert({ user_id: uid, tz, home_lat: home.lat, home_lng: home.lng })
    .throwOnError();

  await db
    .from("schedules")
    .upsert({
      user_id: uid,
      wake_time_local: wake_time,
      grace_min: 60,
      active_everyday: nextActive,
    })
    .throwOnError();

  await db
    .from("stakes")
    .upsert({
      user_id: uid,
      stake_usd: Math.max(1, Math.min(100, Math.round(stake_usd))),
    })
    .throwOnError();

  await db
    .from("audit_logs")
    .insert({ user_id: uid, action: "setup", meta: body })
    .throwOnError();

  return NextResponse.json({ ok: true });
}
