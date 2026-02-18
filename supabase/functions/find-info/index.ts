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
        message: "Добавьте каналы-источники в разделе 'Каналы' для поиска информации.",
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

    // Scrape messages from source channels
    const allMessages: Array<{ text: string; channel: string; date: string; url: string }> = [];
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);

    for (const channel of channels) {
      const username = channel.username.replace(/^@/, "");
      try {
        const resp = await fetch(`https://t.me/s/${username}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });

        if (!resp.ok) continue;

        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) continue;

        const messageElements = doc.querySelectorAll(".tgme_widget_message_wrap");

        for (const el of messageElements) {
          const textEl = el.querySelector(".tgme_widget_message_text");
          const dateEl = el.querySelector(".tgme_widget_message_date time");
          const linkEl = el.querySelector(".tgme_widget_message_date");

          const text = textEl?.textContent?.trim();
          if (!text || text.length < 10) continue;

          const datetime = dateEl?.getAttribute("datetime");
          if (datetime && new Date(datetime) < threeDaysAgo) continue;

          const sourceUrl = linkEl?.getAttribute("href") || `https://t.me/${username}`;

          // Filter by keywords
          const matchesKeyword = keywordList.some((kw: string) =>
            text.toLowerCase().includes(kw.toLowerCase())
          );

          if (matchesKeyword) {
            allMessages.push({
              text: text.substring(0, 2000),
              channel: channel.name,
              date: datetime || new Date().toISOString(),
              url: sourceUrl,
            });
          }
        }
      } catch (err) {
        console.error(`Error scraping ${username}:`, err);
      }
    }

    if (allMessages.length === 0) {
      return new Response(JSON.stringify({
        empty: true,
        message: "За последние 3 дня не найдено сообщений по вашим ключевым словам в каналах-источниках.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate digest with AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const messagesText = allMessages.map((m, i) =>
      `${i + 1}. [${m.channel}] (${new Date(m.date).toLocaleDateString("ru")}): ${m.text}`
    ).join("\n\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
            content: `Проанализируй и создай обзор из ${allMessages.length} сообщений, найденных по ключевым словам [${keywordList.join(", ")}]:\n\n${messagesText}`,
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
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      content,
      messagesFound: allMessages.length,
      channelsScanned: channels.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("find-info error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
