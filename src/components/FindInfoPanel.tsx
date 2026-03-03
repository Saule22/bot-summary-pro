import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Loader2, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

const FindInfoPanel = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("3");
  const [language, setLanguage] = useState("ru");
  const [result, setResult] = useState<{ content: string; messagesFound: number; channelsScanned: number } | null>(null);

  const findInfo = async () => {
    if (!session) return;
    setLoading(true);
    setResult(null);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ period: Number(period), language }),
      });

      const data = await resp.json();

      if (data.empty) {
        toast.info(data.message);
        return;
      }

      if (!resp.ok) {
        throw new Error(data.error || "Ошибка");
      }

      setResult(data);
      toast.success(`Найдено ${data.messagesFound} сообщений из ${data.channelsScanned} каналов`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-primary" /> Найти информацию
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Поиск информации по вашим ключевым словам в каналах-источниках.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Период</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 день</SelectItem>
                  <SelectItem value="3">3 дня</SelectItem>
                  <SelectItem value="7">Неделя</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Язык ответа</label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="kk">Қазақша</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={findInfo} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Поиск...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Найти информацию</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" /> Результаты
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {result.messagesFound} сообщений · {result.channelsScanned} каналов
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{result.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FindInfoPanel;
