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
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { language = "ru", period = "day" } = await req.json();

    // Get user's messages
    const now = new Date();
    let since: Date;
    if (period === "week") since = new Date(now.getTime() - 7 * 86400000);
    else if (period === "month") since = new Date(now.getTime() - 30 * 86400000);
    else since = new Date(now.getTime() - 86400000);

    const { data: messages } = await supabase
      .from("messages")
      .select("text, channels(name)")
      .gte("message_date", since.toISOString())
      .order("message_date", { ascending: false })
      .limit(100);

    // Get user's keywords
    const { data: keywords } = await supabase
      .from("keywords")
      .select("word");

    const keywordList = keywords?.map((k: any) => k.word) || [];
    
    // Filter messages by keywords if any exist
    let filteredMessages = messages || [];
    if (keywordList.length > 0) {
      filteredMessages = filteredMessages.filter((m: any) =>
        keywordList.some((kw: string) => m.text.toLowerCase().includes(kw.toLowerCase()))
      );
    }

    if (filteredMessages.length === 0) {
      return new Response(JSON.stringify({
        error: language === "kk" ? "Таңдалған кезең үшін хабарлар жоқ." : "Нет сообщений за выбранный период.",
        empty: true,
      }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const messagesText = filteredMessages.map((m: any, i: number) =>
      `${i + 1}. [${(m as any).channels?.name || "Канал"}]: ${m.text}`
    ).join("\n\n");

    const langInstruction = language === "kk"
      ? "Қазақ тілінде жаз. Дайджест атауын және әр жаңалықтың қысқаша мазмұнын бер."
      : "Пиши на русском языке. Дай название дайджеста и краткое саммари каждой новости.";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `Ты — AI-ассистент для создания структурированных дайджестов новостей в нише ИИ и Автоматизация. ${langInstruction}

Формат ответа:
TITLE: [Название дайджеста]
---
Далее для каждой новости:
## [Краткий заголовок]
[Саммари в 2-3 предложения]
Источник: [название канала]
---`,
          },
          {
            role: "user",
            content: `Создай структурированный дайджест из следующих сообщений:\n\n${messagesText}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Слишком много запросов, попробуйте позже" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Необходимо пополнить баланс" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const fullText = aiData.choices?.[0]?.message?.content || "";

    // Parse title from response
    const titleMatch = fullText.match(/TITLE:\s*(.+)/);
    const title = titleMatch?.[1]?.trim() || (language === "kk" ? "AI Дайджест" : "AI Дайджест");
    const content = fullText.replace(/TITLE:\s*.+\n---\n?/, "").trim();

    // Save digest
    const { data: digest, error: saveError } = await supabase
      .from("digests")
      .insert({ user_id: user.id, title, content, language, period })
      .select()
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify(digest), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-digest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
