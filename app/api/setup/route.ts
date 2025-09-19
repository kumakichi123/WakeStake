import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export async function POST(req:NextRequest){
  const body = await req.json();
  const { tz, home, wake_time, stake_usd } = body || {};
  if(!tz || !home?.lat || !home?.lng || !wake_time || !stake_usd) return NextResponse.json({error:"bad request"},{status:400});

  // 認証ユーザーID（SupabaseのJWTをヘッダから取得）
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.replace("Bearer ","");
  const { data: userRes } = await supabaseService.auth.getUser(jwt);
  const user = userRes?.user;
  if(!user) return NextResponse.json({error:"unauth"}, {status:401});
  const uid = user.id;

  const db = supabaseService;
  // upserts
  await db.from("profiles").upsert({ user_id: uid, tz, home_lat: home.lat, home_lng: home.lng }).throwOnError();
  await db.from("schedules").upsert({ user_id: uid, wake_time_local: wake_time, grace_min: 60, active_everyday: true }).throwOnError();
  await db.from("stakes").upsert({ user_id: uid, stake_usd: Math.max(1, Math.min(100, Math.round(stake_usd))) }).throwOnError();
  await db.from("audit_logs").insert({ user_id: uid, action: "setup", meta: body }).throwOnError();
  return NextResponse.json({ok:true});
}
