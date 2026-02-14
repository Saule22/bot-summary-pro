import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем ключевые слова пользователя
    const { data: keywords, error: keywordsError } = await supabase
      .from("keywords")
      .select("word")
      .eq("user_id", userId)
      .limit(10);

    if (keywordsError) {
      throw new Error(`Failed to fetch keywords: ${keywordsError.message}`);
    }

    const keywordList = keywords?.map((k) => k.word).join(", ") || "контент, новости";

    // Генерируем идеи с помощью AI
    const systemPrompt = `Ты эксперт по созданию контента. Придумай 5 интересных идей для постов на основе данных ключевых слов. 
    Каждая идея должна быть:
    - Оригинальной и привлекательной
    - Уместной для социальных сетей
    - Практически реализуемой
    
    Формат: список пронумерованных идей с кратким описанием (1-2 предложения на идею).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Придумай идеи контента по этим ключевым словам: ${keywordList}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Слишком много запросов. Попробуйте позже." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Недостаточно средств на аккаунте Lovable AI." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      throw new Error(`AI gateway error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const ideas = data.choices?.[0]?.message?.content || "Не удалось сгенерировать идеи.";

    return new Response(
      JSON.stringify({
        success: true,
        ideas: ideas,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating ideas:", error);
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
