import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, BookOpen, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";


const SourcesPanel = () => {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [fetching, setFetching] = useState<string | null>(null);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("type", "source")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addSource = useMutation({
    mutationFn: async () => {
      const cleanUsername = username.trim().replace(/^@/, "");
      const { error } = await supabase.from("channels").insert({
        user_id: user!.id,
        username: cleanUsername,
        name: name.trim() || cleanUsername,
        type: "source",
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      setUsername("");
      setName("");
      toast.success("Источник добавлен");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sources"] });
      toast.success("Источник удалён");
    },
  });

  const fetchMessages = async (channelId: string, channelUsername: string) => {
    if (!session) return;
    setFetching(channelId);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-channel-messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ channelId, channelUsername }),
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Ошибка загрузки");
      toast.success(`Загружено ${data.count || 0} новых сообщений`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        Источники
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Добавить канал-источник</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addSource.mutate();
            }}
            className="space-y-3"
          >
            <Input
              placeholder="Username канала (например: ai_news или @ai_news)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              placeholder="Название канала (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={addSource.isPending} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              {addSource.isPending ? "Добавление..." : "Добавить источник"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Каналы-источники
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({sources.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Добавьте каналы-источники для поиска информации
            </p>
          ) : (
            <div className="space-y-3">
              {sources.map((src: any) => (
                <div
                  key={src.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{src.name}</span>
                    <span className="text-xs text-muted-foreground">@{src.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchMessages(src.id, src.username)}
                      disabled={fetching === src.id}
                    >
                      {fetching === src.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span className="ml-1 hidden sm:inline">Собрать</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteSource.mutate(src.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Как это работает:</strong> Добавьте публичные Telegram-каналы как источники.
            Нажмите «Собрать» чтобы загрузить их сообщения, затем используйте «Найти информацию»
            для поиска по ключевым словам или «Дайджест» для генерации обзора.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesPanel;
