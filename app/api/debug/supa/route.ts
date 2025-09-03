import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)";
  const key = process.env.SUPABASE_SERVICE_ROLE || "(missing)";

  // REST ile doğrudan test (sdk yerine): network + auth net kanıtı
  let httpOk: boolean | null = null;
  let httpStatus: number | null = null;
  let httpBody: string | null = null;

  try {
    const res = await fetch(`${url}/rest/v1/billing_customers?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    httpOk = res.ok;
    httpStatus = res.status;
    httpBody = (await res.text()).slice(0, 200);
  } catch (e: any) {
    httpOk = false;
    httpBody = `fetch-error: ${e?.message}`;
  }

  return NextResponse.json({
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
    url,
    keyPrefix: key === "(missing)" ? null : key.slice(0, 6) + "...",
    httpOk,
    httpStatus,
    httpBody,
  });
}
