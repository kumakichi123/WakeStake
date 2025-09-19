import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

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

  const { error } = await supabaseService
    .from("schedules")
    .upsert({ user_id: uid, active_everyday: active }, { onConflict: "user_id" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, active });
}
