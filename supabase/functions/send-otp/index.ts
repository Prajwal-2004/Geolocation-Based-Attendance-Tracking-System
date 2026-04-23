import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TWILIO_GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

async function hashOtp(otp: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${otp}:${phone}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendSmsViaTwilio(to: string, body: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

  const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
  if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured (connect Twilio in Connectors)");

  const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");
  if (!TWILIO_FROM_NUMBER) throw new Error("TWILIO_FROM_NUMBER is not configured");

  const res = await fetch(`${TWILIO_GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: to,
      From: TWILIO_FROM_NUMBER,
      Body: body,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Twilio API error [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "phoneNumber is required" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const e164 = phoneNumber.trim();
    if (!/^\+[1-9]\d{6,14}$/.test(e164)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Phone number must be in E.164 format (e.g. +919876543210). Received: "${e164}"`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Store OTP first so verify works even if SMS is slow
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
    try {
      const twilioRes = await sendSmsViaTwilio(
        e164,
        `SafeAttend: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code.`
      );
      console.log(`Twilio message sent. SID: ${twilioRes.sid}`);
    } catch (smsErr) {
      const msg = smsErr instanceof Error ? smsErr.message : "Unknown SMS error";
      console.error("Twilio send failed:", msg);
      return new Response(
        JSON.stringify({ ok: false, error: `Failed to send SMS: ${msg}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent via SMS.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("send-otp error:", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
