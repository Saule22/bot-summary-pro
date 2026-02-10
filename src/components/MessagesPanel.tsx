import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MessagesPanel = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [channelId, setChannelId] = useState("");

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("channels").select("*").order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, channels(name)")
        .order("message_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addMessage = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("messages").insert({
        user_id: user!.id,
        channel_id: channelId,
        text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      setText("");
      toast.success("Сообщение добавлено");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" /> Сообщения
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); addMessage.mutate(); }} className="space-y-3">
          <Select value={channelId} onValueChange={setChannelId}>
            <SelectTrigger><SelectValue placeholder="Выберите канал" /></SelectTrigger>
            <SelectContent>
              {channels.map((ch: any) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Текст сообщения" value={text} onChange={(e) => setText(e.target.value)} required rows={3} />
          <Button type="submit" disabled={addMessage.isPending || !channelId} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Добавить сообщение
          </Button>
        </form>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {messages.map((msg: any) => (
            <div key={msg.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-primary">{(msg as any).channels?.name}</span>
                <span className="text-xs text-muted-foreground">{new Date(msg.message_date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm">{msg.text.slice(0, 150)}{msg.text.length > 150 ? "..." : ""}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MessagesPanel;
