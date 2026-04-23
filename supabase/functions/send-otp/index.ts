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
    const { phoneNumber } = await req.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return new Response(
        JSON.stringify({ error: "phoneNumber is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const e164 = phoneNumber.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
      return new Response(
        JSON.stringify({
          error: "Phone number must be in E.164 format (e.g. +919876543210)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await hashOtp(otp, e164);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    const { error: dbError } = await supabase.from("phone_otps").insert({
      phone_number: e164,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      throw new Error(`Failed to store OTP: ${dbError.message}`);
    }

    // SIMULATED DELIVERY — log to edge function console
    console.log("==================================================");
    console.log(`📱 [SIMULATED OTP] Phone: ${e164}`);
    console.log(`🔑 [SIMULATED OTP] Code:  ${otp}`);
    console.log(`⏱️  Valid for 5 minutes.`);
    console.log("==================================================");

    // Also return the OTP in dev mode so the UI can surface it
    return new Response(
      JSON.stringify({
        success: true,
        simulated: true,
        // Returning the OTP here is OK because this is dev/demo mode.
        // Remove `devOtp` if you ever wire up real SMS delivery.
        devOtp: otp,
        message: "OTP generated (simulated). Check edge function logs.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-otp error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
