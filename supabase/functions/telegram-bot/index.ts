import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function handleMessage(message: { chat: { id: number }; text?: string }) {
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
    return sendMessage(
      chatId,
      "💡 <b>Идеи для контента</b>\n\nФункция генерации идей в разработке. Скоро AI будет предлагать вам темы для постов!",
      getMainKeyboard()
    );
  }

  if (text === "📄 Загрузить документ") {
    return sendMessage(
      chatId,
      "📄 <b>Загрузить документ</b>\n\nОтправьте мне документ (PDF, DOCX, TXT), и я извлеку из него полезную информацию для контента.",
      getMainKeyboard()
    );
  }

  // Default response
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
