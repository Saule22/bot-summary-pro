import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Get user's source channels (type = 'source')
    const { data: channels } = await supabase
      .from("channels")
      .select("id, username, name")
      .eq("type", "source")
      .eq("is_active", true);

    if (!channels || channels.length === 0) {
      return new Response(JSON.stringify({
        empty: true,
        message: "Добавьте каналы-источники в разделе 'Источники' для поиска информации.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user's keywords
    const { data: keywords } = await supabase.from("keywords").select("word");
    const keywordList = keywords?.map((k: any) => k.word) || [];

    if (keywordList.length === 0) {
      return new Response(JSON.stringify({
        empty: true,
        message: "Добавьте ключевые слова в разделе 'Ключевые слова' для фильтрации информации.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const channelIds = channels.map((c: any) => c.id);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

    // Search messages from DB (collected via fetch-channel-messages)
    const { data: dbMessages } = await supabase
      .from("messages")
      .select("text, message_date, source_url, channel_id")
      .in("channel_id", channelIds)
      .gte("message_date", threeDaysAgo)
      .order("message_date", { ascending: false })
      .limit(200);

    const channelMap = Object.fromEntries(channels.map((c: any) => [c.id, c.name]));

    let allMessages: Array<{ text: string; channel: string; date: string; url: string }> = [];

    // Filter DB messages by keywords
    if (dbMessages && dbMessages.length > 0) {
      const filtered = dbMessages.filter((m: any) =>
        keywordList.some((kw: string) => m.text.toLowerCase().includes(kw.toLowerCase()))
      );
      allMessages = filtered.map((m: any) => ({
        text: m.text.substring(0, 2000),
        channel: channelMap[m.channel_id] || "Канал",
        date: m.message_date,
        url: m.source_url || "",
      }));
    }

    // If not enough from DB, also try scraping
    if (allMessages.length < 5) {
      for (const channel of channels) {
        const username = channel.username.replace(/^@/, "");
        try {
          const resp = await fetch(`https://t.me/s/${username}`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml",
              "Accept-Language": "ru-RU,ru;q=0.9",
            },
          });

          if (!resp.ok) {
            console.log(`Scraping ${username} failed: ${resp.status}`);
            continue;
          }

          const html = await resp.text();

          // Simple regex-based parsing (no DOMParser dependency)
          const messageRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
          const dateRegex = /<time[^>]*datetime="([^"]+)"[^>]*>/g;
          const urlRegex = /href="(https:\/\/t\.me\/[^/]+\/\d+)"/g;

          const texts: string[] = [];
          const dates: string[] = [];
          const urls: string[] = [];

          let m;
          while ((m = messageRegex.exec(html)) !== null) {
            // Strip HTML tags
            const text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            if (text.length >= 10) texts.push(text.substring(0, 2000));
          }
          while ((m = dateRegex.exec(html)) !== null) dates.push(m[1]);
          while ((m = urlRegex.exec(html)) !== null) urls.push(m[1]);

          for (let i = 0; i < texts.length; i++) {
            const date = dates[i] || new Date().toISOString();
            if (new Date(date) < new Date(threeDaysAgo)) continue;
            const text = texts[i];
            const matchesKeyword = keywordList.some((kw: string) =>
              text.toLowerCase().includes(kw.toLowerCase())
            );
            if (matchesKeyword) {
              allMessages.push({
                text,
                channel: channel.name,
                date,
                url: urls[i] || `https://t.me/${username}`,
              });
            }
          }
        } catch (err) {
          console.error(`Error scraping ${username}:`, err);
        }
      }
    }

    // Remove duplicates by text similarity
    const uniqueMessages = allMessages.filter((msg, idx, arr) =>
      arr.findIndex((m) => m.text.substring(0, 100) === msg.text.substring(0, 100)) === idx
    );

    if (uniqueMessages.length === 0) {
      return new Response(JSON.stringify({
        empty: true,
        message: `За последние 3 дня не найдено сообщений по ключевым словам [${keywordList.join(", ")}] в каналах-источниках. Попробуйте нажать "Собрать" в разделе Источники для загрузки сообщений.`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate AI summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const messagesText = uniqueMessages.slice(0, 30).map((m, i) =>
      `${i + 1}. [${m.channel}] (${new Date(m.date).toLocaleDateString("ru")}): ${m.text}`
    ).join("\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Ты — AI-аналитик. Создай структурированный обзор найденной информации на русском языке.

Формат:
## 📊 Обзор найденной информации
Краткое резюме: что найдено, сколько источников.

Далее для каждой темы/новости:
### [Заголовок]
[Краткое саммари в 2-3 предложения]
**Источник:** [название канала]

В конце:
## 💡 Ключевые выводы
[3-5 ключевых выводов из найденной информации]`,
          },
          {
            role: "user",
            content: `Проанализируй и создай обзор из ${uniqueMessages.length} сообщений, найденных по ключевым словам [${keywordList.join(", ")}]:\n\n${messagesText}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      content,
      messagesFound: uniqueMessages.length,
      channelsScanned: channels.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("find-info error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
