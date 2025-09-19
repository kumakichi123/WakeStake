import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export async function GET(req:NextRequest){
  const auth = req.headers.get("Authorization")||"";
  const jwt = auth.replace("Bearer ","");
  const { data: { user } } = await supabaseService.auth.getUser(jwt);
  if(!user) return NextResponse.json({error:"unauth"},{status:401});
  const uid = user.id;

  const p = await supabaseService.from("profiles").select("home_lat,home_lng,tz").eq("user_id", uid).maybeSingle();
  const s = await supabaseService.from("schedules").select("wake_time_local").eq("user_id", uid).maybeSingle();
  const k = await supabaseService.from("stakes").select("stake_usd").eq("user_id", uid).maybeSingle();

  const configured = !!(p.data?.tz && p.data?.home_lat && p.data?.home_lng && s.data?.wake_time_local && k.data?.stake_usd);
  return NextResponse.json({ configured });
}
