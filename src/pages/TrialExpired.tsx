import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowRight, LogOut, Check, Sparkles, Copy, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const plans = [
  {
    id: "basic",
    name: "Базовый",
    price: "990",
    features: ["3 канала", "1 дайджест/день", "10 постов/мес"],
  },
  {
    id: "pro",
    name: "PRO",
    price: "2 490",
    popular: true,
    features: ["10 каналов", "5 дайджестов/день", "Безлимит постов", "Обучение AI стилю"],
  },
];

const KASPI_PHONE = "+7 7XX XXX XXXX"; // TODO: заменить на реальный номер
const KASPI_NAME = "Имя Фамилия"; // TODO: заменить

const TrialExpired = () => {
  const [selected, setSelected] = useState("pro");
  const [copied, setCopied] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selected)!;

  const handleCopy = () => {
    navigator.clipboard.writeText(KASPI_PHONE.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Clock className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Пробный период закончился</h1>
          <p className="text-sm text-muted-foreground">
            Выберите тариф и оплатите через Kaspi, чтобы продолжить
          </p>
        </div>

        {/* Plan selection */}
        <div className="grid grid-cols-2 gap-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`relative cursor-pointer transition-all ${
                selected === plan.id
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                  <Sparkles className="h-2.5 w-2.5" /> Популярный
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground">₸/мес</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Kaspi payment instructions */}
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Оплата через Kaspi Pay</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <div>
                  <p className="text-xs text-muted-foreground">Номер Kaspi</p>
                  <p className="font-mono font-medium">{KASPI_PHONE}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 w-8 p-0">
                  {copied ? <CheckCheck className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Получатель</p>
                <p className="font-medium">{KASPI_NAME}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Сумма</p>
                <p className="font-medium">{selectedPlan.price} ₸</p>
              </div>
              <p className="text-xs text-muted-foreground">
                После перевода доступ активируется в течение 1–2 часов. 
                В комментарии к переводу укажите ваш email.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Выйти
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TrialExpired;
