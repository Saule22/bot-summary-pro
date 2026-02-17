import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
    const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

    const webhookBody: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query", "channel_post", "edited_channel_post"],
    };
    if (WEBHOOK_SECRET) {
      webhookBody.secret_token = WEBHOOK_SECRET;
    }

    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook установлен успешно",
        webhook_url: webhookUrl,
        telegram_response: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error setting webhook:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
