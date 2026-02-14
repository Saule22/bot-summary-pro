import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight, Sparkles } from "lucide-react";

const plans = [
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
      "Ваш стиль (обучение AI)",
      "Приоритетная поддержка",
    ],
  },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-14 text-center">
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Простые и понятные тарифы</h2>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Выберите план, который подходит вам. Оплата через Kaspi Pay.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative overflow-hidden border-border/50 transition-all ${
              plan.highlight
                ? "border-primary/50 bg-card shadow-lg shadow-primary/5"
                : "bg-card/50"
            }`}
          >
            {plan.highlight && (
              <div className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-xl bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Популярный
              </div>
            )}
            <CardContent className="p-8">
              <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">₸/мес</span>
              </div>

              <ul className="mb-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                className="w-full gap-2"
                variant={plan.highlight ? "default" : "outline"}
                onClick={() => navigate("/auth")}
              >
                Начать бесплатно <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                5 дней бесплатно, затем {plan.price} ₸/мес
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default PricingSection;
