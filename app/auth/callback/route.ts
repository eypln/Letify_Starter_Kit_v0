import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const redirectBase = process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000";
  const nextPath = url.searchParams.get("next") || "/dashboard/profile";

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set() { /* next/headers cookie mutasyonu gerekli değil */ },
        remove() {},
      },
    }
  );

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL(nextPath, redirectBase));
  }

  return NextResponse.redirect(new URL("/sign-in", redirectBase));
}