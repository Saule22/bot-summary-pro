import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Check,
  ArrowRight,
  Sparkles,
  Radio,
  PenLine,
  BookOpen,
  Search,
  CalendarDays,
  Bot,
  Zap,
  Shield,
  Clock,
} from "lucide-react";

const benefits = [
  {
    icon: Radio,
    title: "Мониторинг каналов",
    desc: "Автоматический сбор сообщений из Telegram-каналов в реальном времени",
  },
  {
    icon: Sparkles,
    title: "AI-дайджесты",
    desc: "Искусственный интеллект создаёт структурированные саммари за любой период",
  },
  {
    icon: PenLine,
    title: "Генерация контента",
    desc: "Посты, сторителлинг, карусели — AI пишет в вашем стиле",
  },
  {
    icon: Search,
    title: "Поиск информации",
    desc: "Находите свежие новости и тренды по вашим ключевым словам",
  },
  {
    icon: CalendarDays,
    title: "Контент-план",
    desc: "Планируйте публикации на неделю вперёд с drag & drop",
  },
  {
    icon: BookOpen,
    title: "Обучение стилю",
    desc: "AI изучает ваш стиль и адаптирует контент под вашу аудиторию",
  },
];

const results = [
  { icon: Zap, value: "5×", label: "быстрее создание контента" },
  { icon: Clock, value: "3ч", label: "экономии в день" },
  { icon: Shield, value: "100%", label: "ваш уникальный стиль" },
];

const Proposal = () => {
  const { clientName } = useParams<{ clientName: string }>();
  const navigate = useNavigate();
  const name = decodeURIComponent(clientName || "Клиент");

  const [channels, setChannels] = useState(5);
  const [posts, setPosts] = useState(20);

  const isBasic = channels <= 3 && posts <= 10;
  const plan = isBasic ? "Базовый" : "PRO";
  const price = isBasic ? 990 : 2490;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-4 text-4xl font-bold sm:text-5xl">
            {name}, у нас есть предложение для вас
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            AI Content Bot — ваш персональный ассистент для создания контента и
            мониторинга Telegram-каналов
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Что вы получите
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <Card
              key={b.title}
              className="border-border/50 bg-card/50 transition-shadow hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">Результаты</h2>
        <div className="grid grid-cols-3 gap-6">
          {results.map((r) => (
            <div key={r.label} className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <r.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">{r.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {r.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Calculator */}
      <section className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Рассчитайте свой тариф
        </h2>
        <Card className="border-border/50 bg-card">
          <CardContent className="space-y-8 p-8">
            <div>
              <div className="mb-3 flex justify-between text-sm">
                <span>Каналов для мониторинга</span>
                <span className="font-semibold">{channels}</span>
              </div>
              <Slider
                value={[channels]}
                onValueChange={(v) => setChannels(v[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div>
              <div className="mb-3 flex justify-between text-sm">
                <span>Постов в месяц</span>
                <span className="font-semibold">
                  {posts >= 50 ? "Безлимит" : posts}
                </span>
              </div>
              <Slider
                value={[posts]}
                onValueChange={(v) => setPosts(v[0])}
                min={5}
                max={50}
                step={5}
              />
            </div>

            <div className="rounded-xl bg-primary/5 p-6 text-center">
              <div className="mb-1 text-sm text-muted-foreground">
                Рекомендуемый тариф
              </div>
              <div className="mb-1 text-lg font-semibold">{plan}</div>
              <div className="text-4xl font-bold text-primary">
                {price.toLocaleString()} ₸
                <span className="text-base font-normal text-muted-foreground">
                  /мес
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                5 дней бесплатно
              </p>
            </div>

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => navigate("/auth")}
            >
              Начать бесплатно <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Tariffs */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Сравнение тарифов
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              name: "Базовый",
              price: "990",
              highlight: false,
              features: [
                "3 канала мониторинга",
                "1 дайджест в день",
                "10 постов в месяц",
                "Поиск информации",
                "Контент-план",
              ],
            },
            {
              name: "PRO",
              price: "2 490",
              highlight: true,
              features: [
                "10 каналов мониторинга",
                "5 дайджестов в день",
                "Безлимит постов",
                "Поиск информации",
                "Контент-план",
                "Обучение AI вашему стилю",
                "Приоритетная поддержка",
              ],
            },
          ].map((p) => (
            <Card
              key={p.name}
              className={`relative border-border/50 transition-all ${
                p.highlight
                  ? "border-primary/50 bg-card shadow-lg shadow-primary/5"
                  : "bg-card/50"
              }`}
            >
              {p.highlight && (
                <div className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-xl bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  <Sparkles className="h-3 w-3" /> Популярный
                </div>
              )}
              <CardContent className="p-8">
                <h3 className="mb-2 text-xl font-bold">{p.name}</h3>
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">₸/мес</span>
                </div>
                <ul className="space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold">
          Готовы попробовать, {name}?
        </h2>
        <p className="mb-8 text-muted-foreground">
          5 дней бесплатного доступа — без привязки карты
        </p>
        <Button
          size="lg"
          className="gap-2"
          onClick={() => navigate("/auth")}
        >
          Начать бесплатно <ArrowRight className="h-4 w-4" />
        </Button>
      </section>
    </div>
  );
};

export default Proposal;
