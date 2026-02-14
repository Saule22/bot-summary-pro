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

async function sendPhoto(chatId: number, photoUrl: string, caption?: string) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoUrl,
    parse_mode: "HTML",
  };
  if (caption) body.caption = caption;

  const res = await fetch(`${TELEGRAM_API}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: "📰 Свежие Новости" }, { text: "💡 Идеи для контента" }],
      [{ text: "📖 Сторителлинг" }, { text: "🎠 Карусель" }],
      [{ text: "🖼 Сгенерировать изображение" }, { text: "📸 Карусель по фото" }],
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

async function getUserKeywords(userId: string): Promise<string> {
  const { data: keywords } = await supabase
    .from("keywords")
    .select("word")
    .eq("user_id", userId)
    .limit(10);
  return keywords?.map((k: { word: string }) => k.word).join(", ") || "контент, маркетинг, социальные сети";
}

async function callAI(systemPrompt: string, userPrompt: string, temperature = 0.8, maxTokens = 1500): Promise<string | null> {
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
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    console.error("AI error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

async function generateImage(prompt: string): Promise<string | null> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [
        { role: "user", content: prompt },
      ],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    console.error("Image gen error:", response.status, await response.text());
    return null;
  }

  const data = await response.json();
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  return imageUrl || null;
}

// Store user state for multi-step flows
const userStates = new Map<number, { action: string; photoFileId?: string }>();

async function generateContentIdeas(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "💡 Генерирую идеи для контента... ⏳");
  const keywordList = await getUserKeywords(userId);

  const ideas = await callAI(
    `Ты эксперт по созданию контента для социальных сетей. Придумай 5 оригинальных идей для постов.
Каждая идея должна быть:
- Оригинальной и привлекательной
- Уместной для Telegram каналов
- С кратким описанием (1-2 предложения)

Формат: пронумерованный список. Не используй markdown, используй простой текст с эмодзи.`,
    `Придумай 5 идей для постов по этим ключевым словам: ${keywordList}`
  );

  if (!ideas) {
    await sendMessage(chatId, "❌ Не удалось сгенерировать идеи. Попробуйте позже.", getMainKeyboard());
    return;
  }

  await sendMessage(
    chatId,
    `💡 <b>Идеи для контента</b>\n\n🔑 Ключевые слова: <i>${keywordList}</i>\n\n${ideas}`,
    getMainKeyboard()
  );
}

async function generateStorytelling(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "📖 Создаю сторителлинг-пост... ⏳");
  const keywordList = await getUserKeywords(userId);

  const story = await callAI(
    `Ты профессиональный копирайтер и мастер сторителлинга. Создай вовлекающий пост-историю для Telegram канала.

Структура поста:
1. Цепляющий хук (первое предложение, которое заставит остановиться)
2. Завязка — опиши ситуацию или проблему
3. Развитие — покажи путь или трансформацию
4. Кульминация — ключевой инсайт или урок
5. Призыв к действию — задай вопрос аудитории для вовлечения

Правила:
- Пиши от первого лица или от лица эксперта
- Используй короткие абзацы (1-2 предложения)
- Добавь эмодзи для акцентов, но не переборщи
- В конце обязательно задай вопрос аудитории
- Не используй markdown, только простой текст
- Длина: 800-1500 символов`,
    `Напиши сторителлинг-пост на тему: ${keywordList}`,
    0.85,
    2000
  );

  if (!story) {
    await sendMessage(chatId, "❌ Не удалось создать сторителлинг. Попробуйте позже.", getMainKeyboard());
    return;
  }

  await sendMessage(
    chatId,
    `📖 <b>Сторителлинг-пост</b>\n\n${story}`,
    getMainKeyboard()
  );
}

async function generateCarousel(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "🎠 Создаю карусель... ⏳");
  const keywordList = await getUserKeywords(userId);

  const carousel = await callAI(
    `Ты эксперт по созданию карусельного контента для соцсетей (Instagram, LinkedIn, Telegram).

Создай текстовую карусель из 7-10 слайдов.

Формат каждого слайда:
📌 Слайд N: [Заголовок]
[Текст слайда — 2-3 коротких предложения]

Структура карусели:
- Слайд 1: Цепляющий заголовок / обложка (вопрос или провокация)
- Слайды 2-8: Основной контент (советы, факты, шаги)
- Предпоследний слайд: Резюме / ключевой вывод
- Последний слайд: Призыв к действию (подписка, лайк, комментарий)

Правила:
- Каждый слайд должен быть самостоятельным и понятным
- Короткие предложения, никаких длинных абзацев
- Используй эмодзи для визуального акцента
- Не используй markdown
- Нумеруй слайды`,
    `Создай карусель на тему: ${keywordList}`,
    0.8,
    2500
  );

  if (!carousel) {
    await sendMessage(chatId, "❌ Не удалось создать карусель. Попробуйте позже.", getMainKeyboard());
    return;
  }

  await sendMessage(
    chatId,
    `🎠 <b>Карусель-пост</b>\n\n🔑 Тема: <i>${keywordList}</i>\n\n${carousel}`,
    getMainKeyboard()
  );
}

async function getPhotoUrl(fileId: string): Promise<string | null> {
  const res = await fetch(`${TELEGRAM_API}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const data = await res.json();
  const filePath = data.result?.file_path;
  if (!filePath) return null;
  return `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
}

async function generateCarouselFromPhoto(chatId: number, userId: string, photoFileId: string): Promise<void> {
  await sendMessage(chatId, "📸 Анализирую фото и создаю карусель... ⏳");

  const photoUrl = await getPhotoUrl(photoFileId);
  if (!photoUrl) {
    await sendMessage(chatId, "❌ Не удалось загрузить фото. Попробуйте ещё раз.", getMainKeyboard());
    return;
  }

  const keywordList = await getUserKeywords(userId);

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
          content: `Ты эксперт по созданию карусельного контента для соцсетей.

На основе присланного фото создай текстовую карусель из 7-10 слайдов.
Фото — это основа контента. Опиши что на нём, и построй карусель вокруг этой темы.

Формат каждого слайда:
📌 Слайд N: [Заголовок]
[Текст слайда — 2-3 коротких предложения]

Структура:
- Слайд 1: Цепляющий заголовок-обложка
- Слайды 2-8: Основной контент, связанный с фото
- Предпоследний слайд: Резюме
- Последний слайд: Призыв к действию

Правила:
- Не используй markdown, только текст с эмодзи
- Нумеруй слайды
- Учти ключевые слова пользователя: ${keywordList}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Создай карусель на основе этого фото" },
            { type: "image_url", image_url: { url: photoUrl } },
          ],
        },
      ],
      temperature: 0.8,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    console.error("AI carousel from photo error:", response.status, await response.text());
    await sendMessage(chatId, "❌ Не удалось создать карусель по фото. Попробуйте позже.", getMainKeyboard());
    userStates.delete(chatId);
    return;
  }

  const data = await response.json();
  const carousel = data.choices?.[0]?.message?.content;

  if (!carousel) {
    await sendMessage(chatId, "❌ Не удалось получить ответ от AI.", getMainKeyboard());
    userStates.delete(chatId);
    return;
  }

  await sendMessage(
    chatId,
    `📸 <b>Карусель по фото</b>\n\n${carousel}`,
    getMainKeyboard()
  );
  userStates.delete(chatId);
}

async function handleImageGeneration(chatId: number, prompt: string): Promise<void> {
  await sendMessage(chatId, "🖼 Генерирую изображение... ⏳");

  const imageUrl = await generateImage(prompt);

  if (!imageUrl) {
    await sendMessage(chatId, "❌ Не удалось сгенерировать изображение. Попробуйте другое описание.", getMainKeyboard());
    return;
  }

  // For base64 images, we need to send as file upload
  if (imageUrl.startsWith("data:")) {
    // Extract base64 data and send via Telegram
    const base64Data = imageUrl.split(",")[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const formData = new FormData();
    formData.append("chat_id", chatId.toString());
    formData.append("photo", new Blob([binaryData], { type: "image/png" }), "generated.png");
    formData.append("caption", `🖼 Изображение по запросу: "${prompt}"`);

    await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      body: formData,
    });
  } else {
    await sendPhoto(chatId, imageUrl, `🖼 Изображение по запросу: "${prompt}"`);
  }

  userStates.delete(chatId);
  await sendMessage(chatId, "✅ Готово! Выберите следующее действие:", getMainKeyboard());
}

async function handleMessage(message: { chat: { id: number; username?: string }; text?: string; photo?: Array<{ file_id: string }> }) {
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start") {
    userStates.delete(chatId);
    return sendMessage(
      chatId,
      `👋 Привет! Я AI Content Bot.\n\n🔑 Ваш Chat ID: <code>${chatId}</code>\n\nСкопируйте его и вставьте в настройках приложения для привязки аккаунта.\n\nВыберите действие:`,
      getMainKeyboard()
    );
  }

  const state = userStates.get(chatId);

  // Handle photo message for carousel-from-photo flow
  if (message.photo && message.photo.length > 0 && state?.action === "awaiting_photo_for_carousel") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Привяжите Telegram в настройках. Ваш Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      userStates.delete(chatId);
      return;
    }
    // Take the highest resolution photo (last in array)
    const photoFileId = message.photo[message.photo.length - 1].file_id;
    await generateCarouselFromPhoto(chatId, userId, photoFileId);
    return;
  }

  // Check if user is in image generation flow
  if (state?.action === "awaiting_image_prompt") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Привяжите Telegram в настройках. Ваш Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      userStates.delete(chatId);
      return;
    }
    await handleImageGeneration(chatId, text);
    return;
  }

  // Commands that require auth
  const authCommands = ["📰 Свежие Новости", "💡 Идеи для контента", "📖 Сторителлинг", "🎠 Карусель", "🖼 Сгенерировать изображение", "📸 Карусель по фото"];
  
  if (authCommands.includes(text)) {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Ваш Telegram не привязан к аккаунту. Привяжите его в настройках приложения, указав ваш Chat ID: <code>" + chatId + "</code>",
        getMainKeyboard()
      );
      return;
    }

    if (text === "📰 Свежие Новости") {
      return sendMessage(chatId, "📰 <b>Свежие Новости</b>\n\nФункция сбора новостей в разработке.", getMainKeyboard());
    }

    if (text === "💡 Идеи для контента") { await generateContentIdeas(chatId, userId); return; }
    if (text === "📖 Сторителлинг") { await generateStorytelling(chatId, userId); return; }
    if (text === "🎠 Карусель") { await generateCarousel(chatId, userId); return; }

    if (text === "🖼 Сгенерировать изображение") {
      userStates.set(chatId, { action: "awaiting_image_prompt" });
      return sendMessage(chatId, "🖼 <b>Генерация изображения</b>\n\nОпишите, какое изображение вы хотите создать.\n\nНапример:\n• <i>Минималистичный баннер для поста про AI</i>\n• <i>Яркая иллюстрация нейросети в стиле киберпанк</i>\n• <i>Фон для stories с градиентом и текстом</i>");
    }

    if (text === "📸 Карусель по фото") {
      userStates.set(chatId, { action: "awaiting_photo_for_carousel" });
      return sendMessage(chatId, "📸 <b>Карусель по фото</b>\n\nОтправьте мне фотографию, и я создам карусель-пост на её основе.\n\nAI проанализирует изображение и сгенерирует 7-10 слайдов с текстом.");
    }
  }

  if (text === "📄 Загрузить документ") {
    return sendMessage(chatId, "📄 <b>Загрузить документ</b>\n\nОтправьте мне документ (PDF, DOCX, TXT), и я извлеку из него полезную информацию для контента.", getMainKeyboard());
  }

  return sendMessage(chatId, "Используйте кнопки меню или отправьте /start", getMainKeyboard());
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
