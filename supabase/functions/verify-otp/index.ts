import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function hashOtp(otp: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${otp}:${phone}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber, otp } = await req.json();

    if (!phoneNumber || !otp) {
      return new Response(
        JSON.stringify({ ok: false, error: "phoneNumber and otp are required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const e164 = String(phoneNumber).trim();
    const code = String(otp).trim();

    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ ok: false, error: "OTP must be 6 digits" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get most recent unverified OTP for this phone
    const { data: rows, error: selErr } = await supabase
      .from("phone_otps")
      .select("*")
      .eq("phone_number", e164)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (selErr) throw new Error(selErr.message);

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No active OTP found. Please request a new one." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const record = rows[0];

    // Expiry check
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return new Response(
        JSON.stringify({ ok: false, error: "OTP has expired. Please request a new one." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Attempt limit
    if (record.attempts >= 5) {
      return new Response(
        JSON.stringify({ ok: false, error: "Too many attempts. Please request a new OTP." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const submittedHash = await hashOtp(code, e164);

    if (submittedHash !== record.otp_hash) {
      await supabase
        .from("phone_otps")
        .update({ attempts: record.attempts + 1 })
        .eq("id", record.id);

      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid OTP",
          attemptsLeft: Math.max(0, 5 - (record.attempts + 1)),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark verified
    await supabase
      .from("phone_otps")
      .update({ verified: true })
      .eq("id", record.id);

    return new Response(
      JSON.stringify({ ok: true, success: true, verified: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("verify-otp error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
