import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PricingSection from "@/components/landing/PricingSection";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot,
  Sparkles,
  Radio,
  Search,
  PenLine,
  CalendarDays,
  MessageSquare,
  Palette,
  Zap,
  Shield,
  Clock,
  ArrowRight,
  Check,
  Star,
} from "lucide-react";

const features = [
  {
    icon: Radio,
    title: "Мониторинг каналов",
    description: "Автоматический сбор сообщений из Telegram-каналов конкурентов и отраслевых источников",
  },
  {
    icon: Sparkles,
    title: "AI-дайджесты",
    description: "Искусственный интеллект анализирует сотни сообщений и создаёт краткие дайджесты",
  },
  {
    icon: PenLine,
    title: "Генерация постов",
    description: "Создавайте уникальный контент на основе трендов: сторителлинг, карусели, новости",
  },
  {
    icon: Search,
    title: "Поиск информации",
    description: "AI ищет свежие новости и данные по вашей тематике в реальном времени",
  },
  {
    icon: CalendarDays,
    title: "Контент-план",
    description: "Планируйте публикации на неделю вперёд с drag & drop календарём",
  },
  {
    icon: Palette,
    title: "Ваш стиль",
    description: "Бот учится писать в вашем уникальном стиле и тоне коммуникации",
  },
];

const steps = [
  { num: "01", title: "Подключите каналы", desc: "Добавьте Telegram-каналы, за которыми хотите следить" },
  { num: "02", title: "Задайте ключевые слова", desc: "Укажите темы, которые вам интересны" },
  { num: "03", title: "Получайте дайджесты", desc: "AI соберёт и проанализирует всё за вас" },
  { num: "04", title: "Создавайте контент", desc: "Генерируйте посты одним нажатием кнопки" },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AI Content Bot</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Войти
            </Button>
            <Button onClick={() => navigate("/auth")} className="gap-2">
              Попробовать бесплатно <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-24 text-center lg:py-36">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Zap className="h-3.5 w-3.5" /> 5 дней бесплатно — без карты
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Ваш AI-ассистент для{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              создания контента
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Мониторьте конкурентов, собирайте тренды, генерируйте уникальные посты — 
            всё на автопилоте с помощью искусственного интеллекта
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 px-8 text-base">
              Начать бесплатно <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="gap-2 px-8 text-base">
              Узнать больше
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Без карты</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> 5 дней бесплатно</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Отмена в любой момент</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Всё, что нужно для контента</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Один инструмент заменяет десяток сервисов. От мониторинга до публикации.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="group border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card">
              <CardContent className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mb-14 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Как это работает</h2>
            <p className="text-muted-foreground">4 простых шага до автоматического контент-маркетинга</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {steps.map((s) => (
              <div key={s.num} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
                  {s.num}
                </div>
                <div>
                  <h3 className="mb-1 text-lg font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mb-6 flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-6 w-6 fill-primary text-primary" />
          ))}
        </div>
        <blockquote className="mb-6 text-xl font-medium italic leading-relaxed sm:text-2xl">
          "Раньше я тратил 3 часа в день на анализ каналов и написание постов. Теперь бот делает это за 10 минут."
        </blockquote>
        <p className="text-muted-foreground">— Контент-маркетолог, 500+ подписчиков</p>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* CTA */}
      <section className="border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-10 sm:p-14">
            <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Попробуйте 5 дней бесплатно</h2>
            <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Полный доступ ко всем функциям. Никаких ограничений. Никакой банковской карты.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 px-10 text-base">
              Создать аккаунт <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Ваши данные защищены шифрованием
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4" /> AI Content Bot
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Все права защищены</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
