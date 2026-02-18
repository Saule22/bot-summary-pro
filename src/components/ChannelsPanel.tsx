import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Radio, Download, Loader2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ChannelsPanel = () => {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [channelType, setChannelType] = useState<"own" | "source">("own");
  const [fetching, setFetching] = useState(false);

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const ownChannels = channels.filter((ch: any) => ch.type === "own" || !ch.type);
  const sourceChannels = channels.filter((ch: any) => ch.type === "source");

  const addChannel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("channels").insert({
        user_id: user!.id,
        name,
        username: username.replace("@", ""),
        type: channelType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      setName("");
      setUsername("");
      toast.success("Канал добавлен");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Канал удалён");
    },
  });

  const fetchMessages = async () => {
    if (!session) return;
    setFetching(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-channel-messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Ошибка");

      if (data.fetched > 0) {
        toast.success(`${data.fetched} сообщений собрано!`);
      } else {
        toast.info("Новых сообщений не найдено");
      }

      if (data.details) {
        data.details.forEach((d: any) => {
          if (d.error) toast.error(`@${d.channel}: ${d.error}`);
        });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setFetching(false);
    }
  };

  const renderChannelList = (list: any[], emptyText: string) => (
    <div className="space-y-2">
      {list.map((ch: any) => (
        <div key={ch.id} className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="font-medium">{ch.name}</span>
            <Badge variant="secondary" className="ml-2">@{ch.username}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => deleteChannel.mutate(ch.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      {list.length === 0 && <p className="text-sm text-muted-foreground">{emptyText}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Radio className="h-5 w-5 text-primary" /> Каналы
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={channelType} onValueChange={(v) => setChannelType(v as "own" | "source")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="own" className="gap-2">
              <Radio className="h-4 w-4" /> Мои каналы
            </TabsTrigger>
            <TabsTrigger value="source" className="gap-2">
              <Search className="h-4 w-4" /> Источники
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); addChannel.mutate(); }} className="flex gap-2">
              <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required className="flex-1" />
              <Input placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} required className="flex-1" />
              <Button type="submit" size="icon" disabled={addChannel.isPending}><Plus className="h-4 w-4" /></Button>
            </form>

            <TabsContent value="own" className="mt-0 space-y-3">
              <Button variant="outline" size="sm" onClick={fetchMessages} disabled={fetching || ownChannels.length === 0} className="w-full">
                {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {fetching ? "Сбор..." : "Собрать сообщения"}
              </Button>
              {renderChannelList(ownChannels, "Добавьте свои каналы для мониторинга")}
            </TabsContent>

            <TabsContent value="source" className="mt-0">
              {renderChannelList(sourceChannels, "Добавьте каналы-источники для поиска информации")}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ChannelsPanel;
