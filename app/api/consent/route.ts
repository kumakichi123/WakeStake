import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

export async function POST(req:NextRequest){
  const { kind } = await req.json();
  const auth = req.headers.get("Authorization")||"";
  const jwt = auth.replace("Bearer ","");
  const { data: { user } } = await supabaseService.auth.getUser(jwt);
  if(!user) return NextResponse.json({error:"unauth"},{status:401});
  await supabaseService.from("audit_logs").insert({ user_id: user.id, action: kind||"consent", meta: { ua: req.headers.get("user-agent") }});
  return NextResponse.json({ok:true});
}
