import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, FileText } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

const DigestPanel = () => {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [language, setLanguage] = useState("ru");
  const [period, setPeriod] = useState("day");
  const [generating, setGenerating] = useState(false);

  const { data: digests = [] } = useQuery({
    queryKey: ["digests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  const generate = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ language, period }),
      });

      if (resp.status === 429) {
        toast.error("Слишком много запросов, попробуйте позже");
        return;
      }
      if (resp.status === 402) {
        toast.error("Необходимо пополнить баланс");
        return;
      }

      const data = await resp.json();
      if (!resp.ok) {
        if (resp.status === 404) {
          toast.info(data.error || "Сообщений не найдено за выбранный период");
          return;
        }
        throw new Error(data.error || "Ошибка генерации");
      }

      toast.success("Дайджест создан!");
      qc.invalidateQueries({ queryKey: ["digests"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" /> Генерация дайджеста
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                <SelectItem value="kk">🇰🇿 Қазақша</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">День</SelectItem>
                <SelectItem value="week">Неделя</SelectItem>
                <SelectItem value="month">Месяц</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={generating} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? "Генерация..." : "Создать дайджест"}
          </Button>
        </CardContent>
      </Card>

      {digests.map((d: any) => (
        <Card key={d.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" /> {d.title}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{d.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DigestPanel;
