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
      [{ text: "📄 Загрузить документ" }, { text: "📋 Дайджест" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function getDigestPeriodKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📅 Күн", callback_data: "digest_day" },
        { text: "📆 Апта", callback_data: "digest_week" },
        { text: "🗓 Ай", callback_data: "digest_month" },
      ],
    ],
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

// Save generated post to database
async function savePost(userId: string, type: string, title: string, content: string, source?: string): Promise<void> {
  try {
    await supabase.from("generated_posts").insert({
      user_id: userId,
      type,
      title,
      content,
      source: source || null,
    });
  } catch (err) {
    console.error("Failed to save post:", err);
  }
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

// ===== DIGEST GENERATION =====
async function generateDigest(chatId: number, userId: string, period: string): Promise<void> {
  await sendMessage(chatId, "📋 Каналдардан хабарламаларды жинап, дайджест жасап жатырмын... ⏳");

  const now = new Date();
  let since: Date;
  let periodLabel: string;
  if (period === "week") {
    since = new Date(now.getTime() - 7 * 86400000);
    periodLabel = "апта";
  } else if (period === "month") {
    since = new Date(now.getTime() - 30 * 86400000);
    periodLabel = "ай";
  } else {
    since = new Date(now.getTime() - 86400000);
    periodLabel = "күн";
  }

  // Get user's channels
  const { data: channels } = await supabase
    .from("channels")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!channels || channels.length === 0) {
    await sendMessage(chatId, "⚠️ Сізде бақылау арналары жоқ. Алдымен веб-қосымшада арналар қосыңыз.", getMainKeyboard());
    return;
  }

  // Get messages from user's channels for the period
  const channelIds = channels.map((c: any) => c.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("text, channel_id")
    .in("channel_id", channelIds)
    .gte("message_date", since.toISOString())
    .order("message_date", { ascending: false })
    .limit(100);

  // Get user's keywords for filtering
  const { data: keywords } = await supabase
    .from("keywords")
    .select("word")
    .eq("user_id", userId);

  const keywordList = keywords?.map((k: any) => k.word) || [];

  let filteredMessages = messages || [];
  if (keywordList.length > 0) {
    filteredMessages = filteredMessages.filter((m: any) =>
      keywordList.some((kw: string) => m.text.toLowerCase().includes(kw.toLowerCase()))
    );
  }

  if (filteredMessages.length === 0) {
    await sendMessage(chatId, `📋 Таңдалған кезеңде (${periodLabel}) хабарламалар табылмады.\n\nКілт сөздер: ${keywordList.length > 0 ? keywordList.join(", ") : "барлығы"}`, getMainKeyboard());
    return;
  }

  // Build channel name map
  const channelMap: Record<string, string> = {};
  channels.forEach((c: any) => { channelMap[c.id] = c.name; });

  const messagesText = filteredMessages.map((m: any, i: number) =>
    `${i + 1}. [${channelMap[m.channel_id] || "Арна"}]: ${m.text}`
  ).join("\n\n");

  const digest = await callAI(
    `Сен AI-ассистентсің, құрылымдалған жаңалық дайджесттерін жасайсың.

Ережелер:
- Қазақ тілінде жаз
- Дайджест тақырыбын бер
- Әр жаңалықтың қысқаша мазмұнын жаз (2-3 сөйлем)
- Жаңалықтарды тақырыптар бойынша топтастыр
- Эмодзи қолдан (📌, 🔥, 💡, 📊, ⚡)
- Markdown қолданба, тек қарапайым мәтін
- Соңында қорытынды жаз

Формат:
📋 [Дайджест тақырыбы]
📅 Кезең: [кезең]

[Жаңалықтар тізімі]

📝 Қорытынды: [қысқаша қорытынды]`,
    `${filteredMessages.length} хабарламадан дайджест жаса (кезең: ${periodLabel}):\n\n${messagesText}`,
    0.4,
    3000
  );

  if (!digest) {
    await sendMessage(chatId, "❌ Дайджест жасау мүмкін болмады. Кейінірек қайталаңыз.", getMainKeyboard());
    return;
  }

  // Save digest to database
  try {
    await supabase.from("digests").insert({
      user_id: userId,
      title: `Дайджест (${periodLabel})`,
      content: digest,
      language: "kk",
      period,
    });
  } catch (err) {
    console.error("Failed to save digest:", err);
  }

  // Split long messages for Telegram (max 4096 chars)
  const header = `📋 <b>Дайджест</b>\n📅 Кезең: ${periodLabel} | 📨 ${filteredMessages.length} хабарлама | 📡 ${channels.length} арна\n${keywordList.length > 0 ? `🔑 Кілт сөздер: ${keywordList.join(", ")}\n` : ""}\n`;
  const fullText = header + digest;

  if (fullText.length > 4000) {
    // Split into chunks
    const chunks: string[] = [];
    let remaining = fullText;
    while (remaining.length > 0) {
      if (remaining.length <= 4000) {
        chunks.push(remaining);
        break;
      }
      let splitAt = remaining.lastIndexOf("\n", 4000);
      if (splitAt < 500) splitAt = 4000;
      chunks.push(remaining.substring(0, splitAt));
      remaining = remaining.substring(splitAt);
    }
    for (const chunk of chunks) {
      await sendMessage(chatId, chunk);
    }
  } else {
    await sendMessage(chatId, fullText);
  }

  await sendMessage(chatId, "✅ Дайджест дайын! Келесі әрекетті таңдаңыз:", getMainKeyboard());
}

async function generateFreshNews(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "📰 Соңғы жаңалықтарды іздеп жатырмын... ⏳");
  const keywordList = await getUserKeywords(userId);

  const news = await callAI(
    `Сен жаңалықтар жинау бойынша сарапшысың. Пайдаланушының кілт сөздері бойынша соңғы және өзекті жаңалықтарды тап.

Ережелер:
- Соңғы 1-7 күндегі жаңалықтарды іздеп, нақты және шынайы ақпарат бер
- 5-7 жаңалық тап
- Әрбір жаңалық үшін:
  • Тақырып (қысқа, нақты)
  • Қысқаша мазмұны (2-3 сөйлем)
  • Неліктен маңызды екенін түсіндір (1 сөйлем)
- Нөмірленген тізім форматында жаз
- Эмодзи қолдан (📌, 🔥, 💡, 📊, 🌍, ⚡)
- Markdown қолданба, тек қарапайым мәтін
- Соңында қорытынды жаз: бұл жаңалықтар контент үшін қалай пайдалы

МАҢЫЗДЫ: Барлық мәтін ҚАЗАҚ тілінде болуы керек, грамматикалық қатесіз.
МАҢЫЗДЫ: Тек нақты, шынайы жаңалықтар бер. Ойдан шығарма.`,
    `Осы кілт сөздер бойынша соңғы жаңалықтарды тап: ${keywordList}

Бүгінгі күн: ${new Date().toISOString().split('T')[0]}`,
    0.3,
    2500
  );

  if (!news) {
    await sendMessage(chatId, "❌ Жаңалықтарды жинау мүмкін болмады. Кейінірек қайталап көріңіз.", getMainKeyboard());
    return;
  }

  await savePost(userId, "news", `Жаңалықтар: ${keywordList}`, news);
  await sendMessage(
    chatId,
    `📰 <b>Соңғы жаңалықтар</b>\n\n🔑 Кілт сөздер: <i>${keywordList}</i>\n📅 Күні: ${new Date().toLocaleDateString('kk-KZ')}\n\n${news}`,
    getMainKeyboard()
  );
}

async function generateContentIdeas(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "💡 Контент идеяларын жасап жатырмын... ⏳");
  const keywordList = await getUserKeywords(userId);

  const ideas = await callAI(
    `Сен әлеуметтік желілерге контент жасау бойынша сарапшысың. 5 түпнұсқа пост идеясын ойлап тап.
Әрбір идея:
- Түпнұсқа және қызықты болуы керек
- Telegram арналарына лайықты болуы керек
- Қысқа сипаттамамен (1-2 сөйлем)

МАҢЫЗДЫ: Барлық мәтін ҚАЗАҚ тілінде болуы керек, грамматикалық қатесіз.
Формат: нөмірленген тізім. Markdown қолданба, қарапайым мәтін мен эмодзи қолдан.`,
    `Осы кілт сөздер бойынша 5 пост идеясын ойлап тап: ${keywordList}`
  );

  if (!ideas) {
    await sendMessage(chatId, "❌ Идеяларды жасау мүмкін болмады. Кейінірек қайталап көріңіз.", getMainKeyboard());
    return;
  }

  await savePost(userId, "ideas", `Идеялар: ${keywordList}`, ideas);
  await sendMessage(
    chatId,
    `💡 <b>Контент идеялары</b>\n\n🔑 Кілт сөздер: <i>${keywordList}</i>\n\n${ideas}`,
    getMainKeyboard()
  );
}

async function generateStorytelling(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "📖 Сторителлинг-пост жасап жатырмын... ⏳");
  const keywordList = await getUserKeywords(userId);

  const story = await callAI(
    `Сен кәсіби копирайтер және сторителлинг шеберісің. Telegram арнасы үшін қызықтыратын пост-әңгіме жаз.

Пост құрылымы:
1. Ілмек (оқуды тоқтатуға мәжбүрлейтін бірінші сөйлем)
2. Кіріспе — жағдайды немесе мәселені сипатта
3. Даму — жолды немесе өзгерісті көрсет
4. Шарықтау — негізгі инсайт немесе сабақ
5. Әрекетке шақыру — аудиторияға сұрақ қой

Ережелер:
- Бірінші жақтан немесе сарапшы атынан жаз
- Қысқа абзацтар қолдан (1-2 сөйлем)
- Акцент үшін эмодзи қос, бірақ артық қолданба
- Соңында аудиторияға сұрақ қой
- Markdown қолданба, тек қарапайым мәтін
- Ұзындығы: 800-1500 таңба

МАҢЫЗДЫ: Барлық мәтін ҚАЗАҚ тілінде болуы керек, грамматикалық қатесіз.`,
    `Осы тақырыпта сторителлинг-пост жаз: ${keywordList}`,
    0.85,
    2000
  );

  if (!story) {
    await sendMessage(chatId, "❌ Сторителлинг жасау мүмкін болмады. Кейінірек қайталап көріңіз.", getMainKeyboard());
    return;
  }

  await savePost(userId, "storytelling", "Сторителлинг", story);
  await sendMessage(
    chatId,
    `📖 <b>Сторителлинг-пост</b>\n\n${story}`,
    getMainKeyboard()
  );
}

async function generateCarousel(chatId: number, userId: string): Promise<void> {
  await sendMessage(chatId, "🎠 Карусель жасап жатырмын... ⏳");
  const keywordList = await getUserKeywords(userId);

  const carousel = await callAI(
    `Сен әлеуметтік желілерге (Instagram, LinkedIn, Telegram) карусель контент жасау бойынша сарапшысың.

7-10 слайдтан тұратын мәтіндік карусель жаса.

Әрбір слайд форматы:
📌 Слайд N: [Тақырып]
[Слайд мәтіні — 2-3 қысқа сөйлем]

Карусель құрылымы:
- Слайд 1: Қызықтыратын тақырып / мұқаба (сұрақ немесе провокация)
- Слайдтар 2-8: Негізгі контент (кеңестер, фактілер, қадамдар)
- Соңғының алдындағы слайд: Қорытынды / негізгі тұжырым
- Соңғы слайд: Әрекетке шақыру (жазылу, лайк, пікір)

Ережелер:
- Әрбір слайд өзі жеке түсінікті болуы керек
- Қысқа сөйлемдер, ұзын абзацтар жоқ
- Визуалды акцент үшін эмодзи қолдан
- Markdown қолданба
- Слайдтарды нөмірле

МАҢЫЗДЫ: Барлық мәтін ҚАЗАҚ тілінде болуы керек, грамматикалық қатесіз.`,
    `Осы тақырыпта карусель жаса: ${keywordList}`,
    0.8,
    2500
  );

  if (!carousel) {
    await sendMessage(chatId, "❌ Карусель жасау мүмкін болмады. Кейінірек қайталап көріңіз.", getMainKeyboard());
    return;
  }

  await savePost(userId, "carousel", `Карусель: ${keywordList}`, carousel);
  await sendMessage(
    chatId,
    `🎠 <b>Карусель-пост</b>\n\n🔑 Тақырып: <i>${keywordList}</i>\n\n${carousel}`,
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
  await sendMessage(chatId, "📸 Фотоны талдап, суреттермен карусель жасап жатырмын... ⏳\n\nБұл 1-2 минут алуы мүмкін.");

  const photoUrl = await getPhotoUrl(photoFileId);
  if (!photoUrl) {
    await sendMessage(chatId, "❌ Фотоны жүктеу мүмкін болмады. Қайталап көріңіз.", getMainKeyboard());
    return;
  }

  const keywordList = await getUserKeywords(userId);

  const structureResponse = await callAI(
    `Сен әлеуметтік желілерге карусель контент жасау бойынша сарапшысың.
Пайдаланушының кілт сөздері негізінде 5 слайдтан тұратын карусель құрылымын жаса.

МАҢЫЗДЫ: Жауап ТЕК JSON массив форматында, markdown жоқ, \`\`\` жоқ, түсіндірмелер жоқ.
Барлық мәтін ҚАЗАҚ тілінде болуы керек, грамматикалық қатесіз.
Формат:
[
  {"title": "Слайд тақырыбы", "text": "Қысқа мәтін 1-2 сөйлем"},
  ...
]

Құрылымы:
- Слайд 1: Қызықтыратын тақырып-мұқаба
- Слайдтар 2-4: Негізгі контент (кеңестер, фактілер)
- Слайд 5: Әрекетке шақыру`,
    `Кілт сөздер: ${keywordList}`,
    0.7,
    1000
  );

  if (!structureResponse) {
    await sendMessage(chatId, "❌ Карусель құрылымын жасау мүмкін болмады. Кейінірек қайталаңыз.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  let slides: Array<{ title: string; text: string }>;
  try {
    const cleaned = structureResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    slides = JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse carousel JSON:", structureResponse);
    await sendMessage(chatId, "❌ Құрылымды жасау кезінде қате. Қайталап көріңіз.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  await sendMessage(chatId, `📸 Фотоңызбен ${slides.length} слайд жасап жатырмын...`);

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
                  text: `Instagram/Telegram үшін карусель слайдын жаса. 
Бұл фотоны негіз/фон ретінде қолдан. Фотоның үстіне мәтін жаз:

ТАҚЫРЫП: ${slide.title}
МӘТІН: ${slide.text}
СЛАЙД НӨМІРІ: ${slideNum}/${slides.length}

Дизайн ережелері:
- Фото көрінуі керек, бірақ мәтіннің оқылуы үшін сәл қараңғылау
- Тақырып ірі қалың ақ шрифтпен жоғарыда немесе ортада
- Мәтін кішірек ақ шрифтпен тақырыптың астында
- Слайд нөмірі бұрышта ұсақ
- Пропорция 1:1 (шаршы)
- Стильді заманауи дизайн
- Барлық мәтін ҚАЗАҚ тілінде болуы керек`
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

  await sendMessage(chatId, "✅ Карусель дайын! Келесі әрекетті таңдаңыз:", getMainKeyboard());
  await clearUserState(chatId);
}

async function generatePostsFromDocument(chatId: number, userId: string, fileId: string, fileName: string): Promise<void> {
  await sendMessage(chatId, "📄 Құжатты жүктеп, талдап жатырмын... ⏳");

  const fileRes = await fetch(`${TELEGRAM_API}/getFile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const fileData = await fileRes.json();
  const filePath = fileData.result?.file_path;

  if (!filePath) {
    await sendMessage(chatId, "❌ Құжатты жүктеу мүмкін болмады. Қайталап көріңіз.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
  const downloadRes = await fetch(fileUrl);
  
  let documentText = "";

  if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    documentText = await downloadRes.text();
  } else {
    const fileBytes = new Uint8Array(await downloadRes.arrayBuffer());
    const base64File = btoa(String.fromCharCode(...fileBytes));
    const mimeType = fileName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream";

    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Осы құжаттан барлық мәтінді шығарып бер. Тек мәтін қайтар, ешқандай түсіндірме қосуға болмайды." },
              { type: "file", file: { filename: fileName, data: base64File, mime_type: mimeType } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!extractResponse.ok) {
      console.error("Document extraction error:", extractResponse.status);
      await sendMessage(chatId, "❌ Құжатты оқу мүмкін болмады. TXT немесе PDF форматында жіберіп көріңіз.", getMainKeyboard());
      await clearUserState(chatId);
      return;
    }

    const extractData = await extractResponse.json();
    documentText = extractData.choices?.[0]?.message?.content || "";
  }

  if (!documentText || documentText.length < 20) {
    await sendMessage(chatId, "❌ Құжатта жеткілікті мәтін табылмады.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  const truncated = documentText.substring(0, 6000);

  await sendMessage(chatId, "✍️ Құжат негізінде посттар жасап жатырмын...");

  const keywordList = await getUserKeywords(userId);

  const posts = await callAI(
    `Сен кәсіби SMM-маман және контент-мейкерсің. Берілген құжат мәтіні негізінде Telegram/Instagram үшін 3 дайын пост жаз.

Ережелер:
- Әрбір пост өз алдына тұтас болуы керек (тақырып + мәтін + CTA)
- Посттар бір-бірін қайталамауы керек
- Ұзындығы: 500-1200 таңба әрқайсысы
- Эмодзи қолдан, бірақ артық емес
- Markdown қолданба, тек қарапайым мәтін
- Кілт сөздерге байланысты контекст қос: ${keywordList}
- Посттар арасында "---" қой

МАҢЫЗДЫ: Барлық мәтін ҚАЗАҚ тілінде болуы керек, грамматикалық қатесіз.`,
    `Мына құжат мәтіні негізінде 3 пост жаз:\n\n${truncated}`,
    0.8,
    3000
  );

  if (!posts) {
    await sendMessage(chatId, "❌ Посттарды жасау мүмкін болмады. Кейінірек қайталаңыз.", getMainKeyboard());
    await clearUserState(chatId);
    return;
  }

  const postList = posts.split("---").map(p => p.trim()).filter(p => p.length > 0);

  for (let i = 0; i < postList.length; i++) {
    await sendMessage(chatId, `📄 <b>Пост ${i + 1}/${postList.length}</b>\n\n${postList[i]}`);
    await savePost(userId, "document", `Құжаттан пост ${i + 1}`, postList[i], fileName);
  }

  await sendMessage(chatId, "✅ Құжат негізінде посттар дайын! Келесі әрекетті таңдаңыз:", getMainKeyboard());
  await clearUserState(chatId);
}

async function handleImageGeneration(chatId: number, prompt: string): Promise<void> {
  await sendMessage(chatId, "🖼 Сурет жасап жатырмын... ⏳");

  const imageUrl = await generateImage(prompt);

  if (!imageUrl) {
    await sendMessage(chatId, "❌ Суретті жасау мүмкін болмады. Басқа сипаттаманы қолданып көріңіз.", getMainKeyboard());
    return;
  }

  if (imageUrl.startsWith("data:")) {
    const base64Data = imageUrl.split(",")[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const formData = new FormData();
    formData.append("chat_id", chatId.toString());
    formData.append("photo", new Blob([binaryData], { type: "image/png" }), "generated.png");
    formData.append("caption", `🖼 Сұраныс бойынша сурет: "${prompt}"`);

    await fetch(`${TELEGRAM_API}/sendPhoto`, {
      method: "POST",
      body: formData,
    });
  } else {
    await sendPhoto(chatId, imageUrl, `🖼 Сұраныс бойынша сурет: "${prompt}"`);
  }

  await clearUserState(chatId);
  await sendMessage(chatId, "✅ Дайын! Келесі әрекетті таңдаңыз:", getMainKeyboard());
}

// ===== MAIN HANDLER =====
async function handleMessage(message: { chat: { id: number; username?: string }; text?: string; photo?: Array<{ file_id: string }>; document?: { file_id: string; file_name?: string; mime_type?: string } }) {
  const chatId = message.chat.id;
  const text = message.text || "";

  if (text === "/start") {
    await clearUserState(chatId);
    return sendMessage(
      chatId,
      `👋 Сәлем! Мен AI Content Bot.\n\n🔑 Сіздің Chat ID: <code>${chatId}</code>\n\nОны көшіріп, қосымша параметрлерінде аккаунтты байланыстыру үшін қойыңыз.\n\nӘрекетті таңдаңыз:`,
      getMainKeyboard()
    );
  }

  const currentAction = await getUserState(chatId);

  // Handle document upload for document processing flow
  if (message.document && currentAction === "awaiting_document") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Telegram-ді параметрлерде байланыстырыңыз. Сіздің Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      await clearUserState(chatId);
      return;
    }
    const fileName = message.document.file_name || "document.txt";
    const supported = [".pdf", ".txt", ".md", ".docx", ".doc"];
    if (!supported.some(ext => fileName.toLowerCase().endsWith(ext))) {
      await sendMessage(chatId, "❌ Бұл формат қолдау көрсетілмейді. PDF, DOCX немесе TXT жіберіңіз.", getMainKeyboard());
      return;
    }
    await generatePostsFromDocument(chatId, userId, message.document.file_id, fileName);
    return;
  }

  // Handle photo message for carousel-from-photo flow
  if (message.photo && message.photo.length > 0 && currentAction === "awaiting_photo_for_carousel") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Telegram-ді параметрлерде байланыстырыңыз. Сіздің Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      await clearUserState(chatId);
      return;
    }
    const photoFileId = message.photo[message.photo.length - 1].file_id;
    await generateCarouselFromPhoto(chatId, userId, photoFileId);
    return;
  }

  // Check if user is in image generation flow
  if (currentAction === "awaiting_image_prompt") {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Telegram-ді параметрлерде байланыстырыңыз. Сіздің Chat ID: <code>" + chatId + "</code>", getMainKeyboard());
      await clearUserState(chatId);
      return;
    }
    await handleImageGeneration(chatId, text);
    return;
  }

  // Commands that require auth
  const authCommands = ["📰 Свежие Новости", "💡 Идеи для контента", "📖 Сторителлинг", "🎠 Карусель", "🖼 Сгенерировать изображение", "📸 Карусель по фото", "📄 Загрузить документ", "📋 Дайджест"];
  
  if (authCommands.includes(text)) {
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Сіздің Telegram аккаунтқа байланыстырылмаған. Қосымша параметрлерінде Chat ID көрсетіңіз: <code>" + chatId + "</code>",
        getMainKeyboard()
      );
      return;
    }

    if (text === "📰 Свежие Новости") {
      await generateFreshNews(chatId, userId);
      return;
    }

    if (text === "💡 Идеи для контента") { await generateContentIdeas(chatId, userId); return; }
    if (text === "📖 Сторителлинг") { await generateStorytelling(chatId, userId); return; }
    if (text === "🎠 Карусель") { await generateCarousel(chatId, userId); return; }

    if (text === "📋 Дайджест") {
      await sendMessage(
        chatId,
        "📋 <b>Дайджест жасау</b>\n\nКаналдардан хабарламаларды жинап, AI дайджест жасаймын.\n\nКезеңді таңдаңыз:",
        getDigestPeriodKeyboard()
      );
      return;
    }

    if (text === "🖼 Сгенерировать изображение") {
      await setUserState(chatId, "awaiting_image_prompt");
      return sendMessage(chatId, "🖼 <b>Сурет генерациясы</b>\n\nҚандай сурет жасағыңыз келетінін сипаттаңыз.\n\nМысалы:\n• <i>AI туралы пост үшін минималистік баннер</i>\n• <i>Киберпанк стиліндегі нейрожелі иллюстрациясы</i>\n• <i>Градиент пен мәтінмен stories фоны</i>");
    }

    if (text === "📸 Карусель по фото") {
      await setUserState(chatId, "awaiting_photo_for_carousel");
      return sendMessage(chatId, "📸 <b>Фото бойынша карусель</b>\n\nМаған фотосурет жіберіңіз, мен оның негізінде карусель-пост жасаймын.\n\nAI суретті талдап, мәтінмен 5 слайд жасайды.");
    }

    if (text === "📄 Загрузить документ") {
      await setUserState(chatId, "awaiting_document");
      return sendMessage(chatId, "📄 <b>Құжат жүктеу</b>\n\nМаған құжат жіберіңіз (PDF, DOCX, TXT), мен одан 3 дайын пост жасаймын.\n\n📎 Файлды тікелей чатқа жіберіңіз.");
    }
  }

  return sendMessage(chatId, "Мәзір батырмаларын қолданыңыз немесе /start жіберіңіз", getMainKeyboard());
}

// ===== CALLBACK QUERY HANDLER (for inline buttons) =====
async function handleCallbackQuery(callbackQuery: { id: string; from: { id: number }; message?: { chat: { id: number } }; data?: string }) {
  const chatId = callbackQuery.message?.chat?.id || callbackQuery.from.id;
  const data = callbackQuery.data || "";

  // Answer the callback to remove loading state
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQuery.id }),
  });

  if (data.startsWith("digest_")) {
    const period = data.replace("digest_", ""); // day, week, month
    const userId = await getUserIdByChatId(chatId);
    if (!userId) {
      await sendMessage(chatId, "⚠️ Telegram аккаунтты байланыстырыңыз.", getMainKeyboard());
      return;
    }
    await generateDigest(chatId, userId, period);
  }
}

// ===== CHANNEL POST HANDLER (auto-collect messages from channels) =====
async function handleChannelPost(post: { chat: { id: number; title?: string; username?: string }; text?: string; caption?: string; date?: number }) {
  const chatId = post.chat.id;
  const chatUsername = post.chat.username;
  const chatTitle = post.chat.title;
  const text = post.text || post.caption || "";

  if (!text || text.length < 5) return; // Skip empty or very short messages

  try {
    // Find all channels matching this chat username or title
    let query = supabase.from("channels").select("id, user_id, name").eq("is_active", true);

    // Match by username (preferred) or by name
    if (chatUsername) {
      query = query.or(`username.eq.${chatUsername},username.eq.@${chatUsername}`);
    } else if (chatTitle) {
      query = query.eq("name", chatTitle);
    } else {
      return;
    }

    const { data: channels, error } = await query;
    if (error) {
      console.error("Channel lookup error:", error);
      return;
    }

    if (!channels || channels.length === 0) {
      console.log(`No matching channel found for: ${chatUsername || chatTitle}`);
      return;
    }

    // Save message for each user who tracks this channel
    const messageDate = post.date ? new Date(post.date * 1000).toISOString() : new Date().toISOString();

    for (const channel of channels) {
      const { error: insertError } = await supabase.from("messages").insert({
        channel_id: channel.id,
        user_id: channel.user_id,
        text,
        message_date: messageDate,
        source_url: chatUsername ? `https://t.me/${chatUsername}` : null,
      });

      if (insertError) {
        // Skip duplicate messages (same text + channel + date)
        if (insertError.code !== "23505") {
          console.error(`Failed to save message for channel ${channel.name}:`, insertError);
        }
      } else {
        console.log(`Saved message from ${chatUsername || chatTitle} for user ${channel.user_id}`);
      }
    }
  } catch (err) {
    console.error("handleChannelPost error:", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate webhook secret token from Telegram
  // Sanitize the same way as set-telegram-webhook (only A-Z, a-z, 0-9, _, -)
  const RAW_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
  const WEBHOOK_SECRET = RAW_SECRET.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 256);
  if (WEBHOOK_SECRET.length > 0) {
    const receivedToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (receivedToken !== WEBHOOK_SECRET) {
      console.error("Invalid webhook secret token. Received:", receivedToken);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    const update = await req.json();

    if (update.message) {
      await handleMessage(update.message);
    }

    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    // Auto-collect messages from channels where bot is admin
    if (update.channel_post) {
      await handleChannelPost(update.channel_post);
    }
    if (update.edited_channel_post) {
      // Optionally handle edited posts too
      await handleChannelPost(update.edited_channel_post);
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
