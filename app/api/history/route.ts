import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") || "";
  const jwt = auth.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseService.auth.getUser(jwt);
  if (!user) return NextResponse.json({ error: "unauth" }, { status: 401 });

  const ev = await supabaseService
    .from("evaluations")
    .select("local_date,status")
    .eq("user_id", user.id)
    .order("local_date", { ascending: false });
  const ch = await supabaseService.from("charges").select("amount_usd").eq("user_id", user.id);
  const streak = await supabaseService
    .from("streaks")
    .select("current_streak,longest_streak")
    .eq("user_id", user.id)
    .maybeSingle();

  const total = (ch.data || []).reduce(
    (sum, row) => sum + (row.amount_usd as unknown as number),
    0
  );

  return NextResponse.json({
    rows: ev.data || [],
    total_usd: total,
    streak: {
      current: streak.data?.current_streak || 0,
      longest: streak.data?.longest_streak || 0,
    },
  });
}
