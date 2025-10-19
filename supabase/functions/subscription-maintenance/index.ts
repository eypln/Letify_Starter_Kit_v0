
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Sadece süresi dolmuş ve aktif olanları güncelle
  const nowIso = new Date().toISOString();
  const patchUrl = `${supabaseUrl}/rest/v1/billing_subscriptions?status=eq.active&current_period_end=lt.${nowIso}`;
  const patchRes = await fetch(patchUrl, {
    method: "PATCH",
    headers: {
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({ plan_type: "free", status: "canceled" })
  });
  const result = await patchRes.json();
  return new Response(JSON.stringify({ ok: true, updated: result.length }), {
    headers: { "Content-Type": "application/json" }
  });
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/subscription-maintenance' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
