import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseService.auth.getUser(jwt);
  if (!user) {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }

  const uid = user.id;
  const [profile, schedule, stake] = await Promise.all([
    supabaseService.from("profiles").select("tz,home_lat,home_lng").eq("user_id", uid).maybeSingle(),
    supabaseService
      .from("schedules")
      .select("wake_time_local,grace_min,active_everyday")
      .eq("user_id", uid)
      .maybeSingle(),
    supabaseService.from("stakes").select("stake_usd").eq("user_id", uid).maybeSingle(),
  ]);

  return NextResponse.json({
    tz: profile.data?.tz || "UTC",
    home_lat: profile.data?.home_lat ?? null,
    home_lng: profile.data?.home_lng ?? null,
    wake_time: schedule.data?.wake_time_local || "07:00",
    grace_min: schedule.data?.grace_min || 60,
    active_everyday: schedule.data?.active_everyday ?? true,
    stake_usd: stake.data?.stake_usd || 5,
  });
}
