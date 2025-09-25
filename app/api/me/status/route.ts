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

  const [profile, schedule, stake, billing] = await Promise.all([
    supabaseService.from("profiles").select("tz,home_lat,home_lng").eq("user_id", uid).maybeSingle(),
    supabaseService.from("schedules").select("wake_time_local,grace_min,active_everyday").eq("user_id", uid).maybeSingle(),
    supabaseService.from("stakes").select("stake_usd").eq("user_id", uid).maybeSingle(),
    supabaseService.from("billing").select("stripe_subscription_id").eq("user_id", uid).maybeSingle(),
  ]);

  const hasProfile = Boolean(
    profile.data?.tz &&
      profile.data?.home_lat !== null &&
      profile.data?.home_lat !== undefined &&
      profile.data?.home_lng !== null &&
      profile.data?.home_lng !== undefined
  );

  const hasSchedule = Boolean(schedule.data?.wake_time_local);
  const hasStake = typeof stake.data?.stake_usd === "number";
  const hasStripe = Boolean(billing.data?.stripe_subscription_id);

  const configured = hasProfile && hasSchedule && hasStake && hasStripe;

  return NextResponse.json({ configured, hasProfile, hasSchedule, hasStake, hasStripe });
}
