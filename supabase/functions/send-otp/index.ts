import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");
    if (!TWILIO_FROM_NUMBER)
      throw new Error(
        "TWILIO_FROM_NUMBER is not configured. Add your Twilio phone number (E.164 format, e.g. +12025551234) as a secret."
      );

    const { phoneNumber } = await req.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return new Response(
        JSON.stringify({ error: "phoneNumber is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic E.164 validation
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

    // Send via Twilio
    const body = `Your GeoAttend verification code is ${otp}. Valid for 5 minutes. Do not share this code.`;

    const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: e164,
        From: TWILIO_FROM_NUMBER,
        Body: body,
      }),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", twilioRes.status, twilioData);
      return new Response(
        JSON.stringify({
          error: `Twilio failed [${twilioRes.status}]: ${
            twilioData?.message || JSON.stringify(twilioData)
          }`,
          twilioCode: twilioData?.code,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`OTP sent to ${e164}, Twilio SID: ${twilioData.sid}`);

    return new Response(
      JSON.stringify({ success: true, sid: twilioData.sid }),
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
