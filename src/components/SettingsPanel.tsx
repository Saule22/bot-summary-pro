import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Settings, Loader2, CheckCircle, AlertCircle, Unlink2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const telegramFormSchema = z.object({
  chatId: z
    .string()
    .min(1, "Chat ID обязателен")
    .regex(/^\d+$/, "Chat ID должен содержать только цифры")
});

type TelegramFormValues = z.infer<typeof telegramFormSchema>;

const SettingsPanel = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [telegramData, setTelegramData] = useState<{ id: string; telegram_chat_id: number; created_at: string } | null>(null);
  const [isLoadingTelegram, setIsLoadingTelegram] = useState(true);

  const form = useForm<TelegramFormValues>({
    resolver: zodResolver(telegramFormSchema),
    defaultValues: {
      chatId: "" as any,
    },
  });

  useEffect(() => {
    if (!user) {
      setIsLoadingTelegram(false);
      return;
    }

    const fetchTelegramData = async () => {
      try {
        const { data, error } = await supabase
          .from("telegram_users")
          .select("id, telegram_chat_id, created_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setTelegramData(data);
      } catch (error) {
        console.error("Error fetching telegram data:", error);
      } finally {
        setIsLoadingTelegram(false);
      }
    };

    fetchTelegramData();
  }, [user]);

  const onSubmit = async (values: TelegramFormValues) => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Вы должны быть авторизованы",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (telegramData) {
        // Update existing
        const { error } = await supabase
          .from("telegram_users")
          .update({
            telegram_chat_id: parseInt(values.chatId),
          })
          .eq("id", telegramData.id);

        if (error) throw error;
        setTelegramData({
          ...telegramData,
          telegram_chat_id: parseInt(values.chatId),
        });
        toast({
          title: "Успешно",
          description: "Telegram аккаунт обновлён",
        });
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("telegram_users")
          .insert({
            user_id: user.id,
            telegram_chat_id: parseInt(values.chatId),
          })
          .select()
          .single();

        if (error) throw error;
        setTelegramData(data);
        toast({
          title: "Успешно",
          description: "Telegram аккаунт привязан",
        });
      }
      form.reset();
    } catch (error) {
      console.error("Error saving telegram data:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить данные Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!telegramData) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("telegram_users")
        .delete()
        .eq("id", telegramData.id);

      if (error) throw error;
      setTelegramData(null);
      toast({
        title: "Успешно",
        description: "Telegram аккаунт отвязан",
      });
    } catch (error) {
      console.error("Error unlinking telegram:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось отвязать Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Настройки
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Требуется авторизация для доступа к настройкам.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Настройки
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Привязка Telegram аккаунта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingTelegram ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Загрузка...</span>
            </div>
          ) : telegramData ? (
            <div className="space-y-4">
              <div className="p-4 bg-accent/10 border border-accent rounded-lg">
                <div className="flex items-center gap-2 text-accent mb-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Аккаунт привязан</span>
                </div>
                <p className="text-sm text-accent/80">
                  Chat ID: <code className="bg-accent/20 px-2 py-1 rounded">{telegramData.telegram_chat_id}</code>
                </p>
                <p className="text-xs text-accent/70 mt-2">
                  Привязано: {new Date(telegramData.created_at).toLocaleDateString("ru-RU")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={isLoading}
                className="text-destructive hover:bg-destructive/10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отвязывание...
                  </>
                ) : (
                  <>
                    <Unlink2 className="mr-2 h-4 w-4" />
                    Отвязать аккаунт
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="chatId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chat ID Telegram бота</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Введите ваш Chat ID (можно узнать у бота /start)"
                          type="text"
                          inputMode="numeric"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-2">
                        Напишите боту /start, чтобы узнать ваш Chat ID
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    "Привязать аккаунт"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">О настройках</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Привяжите ваш Telegram аккаунт, чтобы использовать все возможности бота для генерации идей контента и получения новостей по вашим ключевым словам.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPanel;
