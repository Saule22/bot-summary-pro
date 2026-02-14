import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Radio, Download, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ChannelsPanel = () => {
  const { user, session } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
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

  const addChannel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("channels").insert({ user_id: user!.id, name, username: username.replace("@", "") });
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
        toast.success(`${data.fetched} хабарлама жиналды!`);
      } else {
        toast.info("Жаңа хабарламалар табылмады");
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-primary" /> Каналы
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchMessages} disabled={fetching || channels.length === 0}>
            {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {fetching ? "Жинауда..." : "Хабарламаларды жинау"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); addChannel.mutate(); }} className="flex gap-2">
          <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} required className="flex-1" />
          <Input placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} required className="flex-1" />
          <Button type="submit" size="icon" disabled={addChannel.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
        <div className="space-y-2">
          {channels.map((ch: any) => (
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
          {channels.length === 0 && <p className="text-sm text-muted-foreground">Добавьте каналы для мониторинга</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChannelsPanel;
