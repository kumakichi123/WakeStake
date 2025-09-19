import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

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

  const schedule = await supabaseService
    .from("schedules")
    .select("wake_time_local,grace_min")
    .eq("user_id", uid)
    .maybeSingle();

  if (schedule.error) {
    return NextResponse.json({ error: schedule.error.message }, { status: 500 });
  }

  if (schedule.data) {
    const { error } = await supabaseService
      .from("schedules")
      .update({ active_everyday: active })
      .eq("user_id", uid);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabaseService.from("schedules").insert({
      user_id: uid,
      wake_time_local: DEFAULT_WAKE,
      grace_min: DEFAULT_GRACE,
      active_everyday: active,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, active });
}
