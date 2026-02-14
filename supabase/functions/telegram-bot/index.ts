import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.0";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: "📰 Свежие Новости" }],
      [{ text: "💡 Идеи для контента" }],
      [{ text: "📄 Загрузить документ" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

async function getUserIdByChatId(chatId: number): Promise<string | null> {
  const { data } = await supabase
    .from("telegram_users")
    .select("user_id")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return data?.user_id || null;
}

async function generateContentIdeas(chatId: number): Promise<void> {
  const userId = await getUserIdByChatId(chatId);

  if (!userId) {
    await sendMessage(
      chatId,
      "⚠️ Ваш Telegram не привязан к аккаунту. Привяжите его в настройках приложения, указав ваш Chat ID: <code>" + chatId + "</code>",
      getMainKeyboard()
    );
    return;
  }

  // Отправляем сообщение "думаю..."
  await sendMessage(chatId, "💡 Генерирую идеи для контента... ⏳");

  // Получаем ключевые слова пользователя
  const { data: keywords } = await supabase
    .from("keywords")
    .select("word")
    .eq("user_id", userId)
    .limit(10);

  const keywordList = keywords?.map((k: { word: string }) => k.word).join(", ") || "контент, маркетинг, социальные сети";

  // Генерируем идеи через AI
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          content: `Ты эксперт по созданию контента для социальных сетей. Придумай 5 оригинальных идей для постов.
Каждая идея должна быть:
- Оригинальной и привлекательной
- Уместной для Telegram каналов
- С кратким описанием (1-2 предложения)

Формат: пронумерованный список. Не используй markdown, используй простой текст с эмодзи.`,
        },
        {
          role: "user",
          content: `Придумай 5 идей для постов по этим ключевым словам: ${keywordList}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI error:", response.status, errorText);
    await sendMessage(
      chatId,
      "❌ Не удалось сгенерировать идеи. Попробуйте позже.",
      getMainKeyboard()
    );
    return;
  }

  const data = await response.json();
  const ideas = data.choices?.[0]?.message?.content || "Не удалось получить ответ от AI.";

  await sendMessage(
    chatId,
    `💡 <b>Идеи для контента</b>\n\n🔑 Ключевые слова: <i>${keywordList}</i>\n\n${ideas}`,
    getMainKeyboard()
  );
}

async function handleMessage(message: { chat: { id: number; username?: string }; text?: string }) {
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start") {
    return sendMessage(
      chatId,
      "👋 Привет! Я AI Content Bot.\n\nВыберите действие:",
      getMainKeyboard()
    );
  }

  if (text === "📰 Свежие Новости") {
    return sendMessage(
      chatId,
      "📰 <b>Свежие Новости</b>\n\nФункция сбора новостей в разработке. Скоро здесь появятся актуальные новости по вашим ключевым словам!",
      getMainKeyboard()
    );
  }

  if (text === "💡 Идеи для контента") {
    await generateContentIdeas(chatId);
    return;
  }

  if (text === "📄 Загрузить документ") {
    return sendMessage(
      chatId,
      "📄 <b>Загрузить документ</b>\n\nОтправьте мне документ (PDF, DOCX, TXT), и я извлеку из него полезную информацию для контента.",
      getMainKeyboard()
    );
  }

  return sendMessage(
    chatId,
    "Используйте кнопки меню или отправьте /start",
    getMainKeyboard()
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const update = await req.json();

    if (update.message) {
      await handleMessage(update.message);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
