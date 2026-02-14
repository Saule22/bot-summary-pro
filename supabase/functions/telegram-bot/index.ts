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

// State management via database (Edge Functions are stateless)
async function getUserState(chatId: number): Promise<string | null> {
  const { data } = await supabase
    .from("telegram_user_states")
    .select("action")
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  return data?.action || null;
}

async function setUserState(chatId: number, action: string): Promise<void> {
  await supabase
    .from("telegram_user_states")
    .upsert({ telegram_chat_id: chatId, action }, { onConflict: "telegram_chat_id" });
}

async function clearUserState(chatId: number): Promise<void> {
  await supabase
    .from("telegram_user_states")
    .delete()
    .eq("telegram_chat_id", chatId);
}

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
  await sendMessage(chatId, "📸 Анализирую фото и создаю карусель с изображениями... ⏳\n\nЭто может занять 1-2 минуты.");

  const photoUrl = await getPhotoUrl(photoFileId);
  if (!photoUrl) {
    await sendMessage(chatId, "❌ Не удалось загрузить фото. Попробуйте ещё раз.", getMainKeyboard());
    return;
  }

  const keywordList = await getUserKeywords(userId);

  // Step 1: Generate carousel text structure (JSON)
  const structureResponse = await callAI(
    `Ты эксперт по созданию карусельного контента для соцсетей.
Создай структуру карусели из 5 слайдов на основе ключевых слов пользователя.

ВАЖНО: Ответ ТОЛЬКО в формате JSON массива, без markdown, без \`\`\`, без пояснений.
Формат:
[
  {"title": "Заголовок слайда", "text": "Краткий текст 1-2 предложения"},
  ...
]

Структура:
- Слайд 1: Цепляющий заголовок-обложка
- Слайды 2-4: Основной контент (советы, факты)
- Слайд 5: Призыв к действию`,
    `Ключевые слова: ${keywordList}`,
    0.7,
    1000
  );

  if (!structureResponse) {
    await sendMessage(chatId, "❌ Не удалось создать структуру карусели. Попробуйте позже.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  let slides: Array<{ title: string; text: string }>;
  try {
    const cleaned = structureResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    slides = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse carousel JSON:", structureResponse);
    await sendMessage(chatId, "❌ Ошибка при создании структуры. Попробуйте ещё раз.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  // Step 2: Generate image for each slide using the user's photo + text overlay
  await sendMessage(chatId, `📸 Создаю ${slides.length} слайдов с вашим фото...`);

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideNum = i + 1;

    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Создай слайд для карусели в Instagram/Telegram. 
Используй это фото как основу/фон. Наложи поверх фото текст:

ЗАГОЛОВОК: ${slide.title}
ТЕКСТ: ${slide.text}
НОМЕР СЛАЙДА: ${slideNum}/${slides.length}

Правила дизайна:
- Фото должно быть видно, но слегка затемнено для читаемости текста
- Заголовок крупным жирным белым шрифтом сверху или по центру
- Текст поменьше белым шрифтом под заголовком
- Номер слайда мелко в углу
- Соотношение сторон 1:1 (квадрат)
- Стильный современный дизайн`
                },
                {
                  type: "image_url",
                  image_url: { url: photoUrl }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        console.error(`Slide ${slideNum} generation error:`, imageResponse.status);
        // Send text fallback for this slide
        await sendMessage(chatId, `📌 <b>Слайд ${slideNum}/${slides.length}: ${slide.title}</b>\n\n${slide.text}`);
        continue;
      }

      const imageData = await imageResponse.json();
      const slideImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (slideImageUrl && slideImageUrl.startsWith("data:")) {
        const base64Data = slideImageUrl.split(",")[1];
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        const formData = new FormData();
        formData.append("chat_id", chatId.toString());
        formData.append("photo", new Blob([binaryData], { type: "image/png" }), `slide_${slideNum}.png`);
        formData.append("caption", `📌 Слайд ${slideNum}/${slides.length}: ${slide.title}\n\n${slide.text}`);

        await fetch(`${TELEGRAM_API}/sendPhoto`, {
          method: "POST",
          body: formData,
        });
      } else if (slideImageUrl) {
        await sendPhoto(chatId, slideImageUrl, `📌 Слайд ${slideNum}/${slides.length}: ${slide.title}\n\n${slide.text}`);
      } else {
        await sendMessage(chatId, `📌 <b>Слайд ${slideNum}/${slides.length}: ${slide.title}</b>\n\n${slide.text}`);
      }
    } catch (err) {
      console.error(`Error generating slide ${slideNum}:`, err);
      await sendMessage(chatId, `📌 <b>Слайд ${slideNum}/${slides.length}: ${slide.title}</b>\n\n${slide.text}`);
    }
  }

  await sendMessage(chatId, "✅ Карусель готова! Выберите следующее действие:", getMainKeyboard());
  await clearUserState(chatId);
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

  await clearUserState(chatId);
  await sendMessage(chatId, "✅ Готово! Выберите следующее действие:", getMainKeyboard());
}

async function handleMessage(message: { chat: { id: number; username?: string }; text?: string; photo?: Array<{ file_id: string }> }) {
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start") {
    await clearUserState(chatId);
    return sendMessage(
      chatId,
      `👋 Привет! Я AI Content Bot.\n\n🔑 Ваш Chat ID: <code>${chatId}</code>\n\nСкопируйте его и вставьте в настройках приложения для привязки аккаунта.\n\nВыберите действие:`,
      getMainKeyboard()
    );
  }

  const currentAction = await getUserState(chatId);

  // Handle photo message for carousel-from-photo flow
  if (message.photo && message.photo.length > 0 && currentAction === "awaiting_photo_for_carousel") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Привяжите Telegram в настройках. Ваш Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      await clearUserState(chatId);
      return;
    }
    // Take the highest resolution photo (last in array)
    const photoFileId = message.photo[message.photo.length - 1].file_id;
    await generateCarouselFromPhoto(chatId, userId, photoFileId);
    return;
  }

  // Check if user is in image generation flow
  if (currentAction === "awaiting_image_prompt") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Привяжите Telegram в настройках. Ваш Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      await clearUserState(chatId);
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
      await setUserState(chatId, "awaiting_image_prompt");
      return sendMessage(chatId, "🖼 <b>Генерация изображения</b>\n\nОпишите, какое изображение вы хотите создать.\n\nНапример:\n• <i>Минималистичный баннер для поста про AI</i>\n• <i>Яркая иллюстрация нейросети в стиле киберпанк</i>\n• <i>Фон для stories с градиентом и текстом</i>");
    }

    if (text === "📸 Карусель по фото") {
      await setUserState(chatId, "awaiting_photo_for_carousel");
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
