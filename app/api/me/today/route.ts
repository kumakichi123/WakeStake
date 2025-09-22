import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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

  const [{ data: profile }] = await Promise.all([
    supabaseService.from("profiles").select("tz").eq("user_id", uid).maybeSingle(),
  ]);

  const tz = profile?.tz || "UTC";
  const todayLocal = dayjs().tz(tz).format("YYYY-MM-DD");

  const evaluation = await supabaseService
    .from("evaluations")
    .select("status")
    .eq("user_id", uid)
    .eq("local_date", todayLocal)
    .maybeSingle();

  const checked = evaluation.data?.status === "success";

  return NextResponse.json({
    checked,
    message: checked ? "Today's check-in is already complete." : undefined,
  });
}
