"use client";
import { useEffect } from "react";
import { supabaseAnon } from "@/lib/supabase-browser";

export default function Providers({children}:{children:React.ReactNode}){
  useEffect(()=>{
    // APIへ自動でAuthorizationを付加
    const orig = window.fetch;
    window.fetch = (input:any, init:any={})=>{
      return supabaseAnon.auth.getSession().then(({ data })=>{
        const token = data.session?.access_token;
        const headers = new Headers(init?.headers||{});
        if(token) headers.set("Authorization", `Bearer ${token}`);
        return orig(input, { ...init, headers });
      });
    };
  },[]);
  return <>{children}</>;
}
