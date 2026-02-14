import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth with user token
    const userSupabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Service role for inserts (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's active channels
    const { data: channels, error: chErr } = await userSupabase
      .from("channels")
      .select("id, username, name")
      .eq("is_active", true);

    if (chErr) throw chErr;
    if (!channels || channels.length === 0) {
      return new Response(JSON.stringify({ message: "Арналар табылмады", fetched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalFetched = 0;
    const results: Array<{ channel: string; fetched: number; error?: string }> = [];

    for (const channel of channels) {
      const username = channel.username.replace(/^@/, "");
      try {
        // Fetch public channel page
        const resp = await fetch(`https://t.me/s/${username}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (!resp.ok) {
          results.push({ channel: username, fetched: 0, error: `HTTP ${resp.status}` });
          continue;
        }

        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) {
          results.push({ channel: username, fetched: 0, error: "Parse error" });
          continue;
        }

        // Extract messages from tgme_widget_message elements
        const messageElements = doc.querySelectorAll(".tgme_widget_message_wrap");
        let channelFetched = 0;

        for (const el of messageElements) {
          const textEl = el.querySelector(".tgme_widget_message_text");
          const dateEl = el.querySelector(".tgme_widget_message_date time");
          const linkEl = el.querySelector(".tgme_widget_message_date");

          const text = textEl?.textContent?.trim();
          if (!text || text.length < 5) continue;

          const datetime = dateEl?.getAttribute("datetime") || new Date().toISOString();
          const sourceUrl = linkEl?.getAttribute("href") || `https://t.me/${username}`;

          // Insert message, skip duplicates
          const { error: insertErr } = await supabase.from("messages").insert({
            channel_id: channel.id,
            user_id: user.id,
            text: text.substring(0, 10000), // Limit text length
            message_date: datetime,
            source_url: sourceUrl,
          });

          if (!insertErr) {
            channelFetched++;
          }
          // Silently skip duplicates
        }

        totalFetched += channelFetched;
        results.push({ channel: username, fetched: channelFetched });
      } catch (err) {
        console.error(`Error fetching ${username}:`, err);
        results.push({ channel: username, fetched: 0, error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return new Response(JSON.stringify({
      message: `${totalFetched} хабарлама жиналды`,
      fetched: totalFetched,
      details: results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-channel-messages error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
