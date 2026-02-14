import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ArrowRight, Bot, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TrialExpired = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Clock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mb-3 text-2xl font-bold">Пробный период закончился</h1>
          <p className="mb-6 text-muted-foreground">
            Ваш 5-дневный бесплатный период завершён. Оформите подписку, чтобы продолжить использование AI Content Bot.
          </p>
          <Button size="lg" className="mb-3 w-full gap-2" disabled>
            Оформить подписку <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mb-4 text-xs text-muted-foreground">Подписка скоро будет доступна</p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Выйти
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialExpired;
