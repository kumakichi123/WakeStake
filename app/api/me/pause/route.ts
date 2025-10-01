import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { localWindowUTC } from "@/lib/utils";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_WAKE = "07:00";
const DEFAULT_GRACE = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { active } = body ?? {};
  if (typeof active !== "boolean") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseService.auth.getUser(jwt);
  if (!user) {
    return NextResponse.json({ error: "unauth" }, { status: 401 });
  }
  const uid = user.id;

  const profile = await supabaseService
    .from("profiles")
    .select("tz")
    .eq("user_id", uid)
    .maybeSingle();

  if (profile.error) {
    return NextResponse.json({ error: profile.error.message }, { status: 500 });
  }

  const tz = profile.data?.tz || "UTC";

  const schedule = await supabaseService
    .from("schedules")
    .select("wake_time_local,grace_min,active_effective_local_date")
    .eq("user_id", uid)
    .maybeSingle();

  if (schedule.error) {
    return NextResponse.json({ error: schedule.error.message }, { status: 500 });
  }

  const wake = schedule.data?.wake_time_local || DEFAULT_WAKE;
  const grace = schedule.data?.grace_min ?? DEFAULT_GRACE;

  let activeEffectiveLocalDate: string | null = null;
  if (active) {
    const todayLocal = dayjs().tz(tz).format("YYYY-MM-DD");
    const windowUtc = localWindowUTC(tz, todayLocal, wake, grace);
    const nowUtc = new Date();
    if (nowUtc >= windowUtc.endUtc) {
      activeEffectiveLocalDate = dayjs.tz(todayLocal, tz).add(1, "day").format("YYYY-MM-DD");
    } else {
      activeEffectiveLocalDate = todayLocal;
    }
  }

  if (schedule.data) {
    const { error } = await supabaseService
      .from("schedules")
      .update({
        active_everyday: active,
        active_effective_local_date: active ? activeEffectiveLocalDate : null,
      })
      .eq("user_id", uid);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseService.from("schedules").insert({
      user_id: uid,
      wake_time_local: wake,
      grace_min: grace,
      active_everyday: active,
      active_effective_local_date: active ? activeEffectiveLocalDate : null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, active, activeEffectiveLocalDate });
}

