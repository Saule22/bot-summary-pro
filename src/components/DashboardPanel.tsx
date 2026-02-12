import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Tag, MessageSquare, Sparkles } from "lucide-react";

const DashboardPanel = () => {
  const { data: channelCount = 0 } = useQuery({
    queryKey: ["channels-count"],
    queryFn: async () => {
      const { count } = await supabase.from("channels").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: keywordCount = 0 } = useQuery({
    queryKey: ["keywords-count"],
    queryFn: async () => {
      const { count } = await supabase.from("keywords").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: messageCount = 0 } = useQuery({
    queryKey: ["messages-count"],
    queryFn: async () => {
      const { count } = await supabase.from("messages").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: digestCount = 0 } = useQuery({
    queryKey: ["digests-count"],
    queryFn: async () => {
      const { count } = await supabase.from("digests").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Каналы", value: channelCount, icon: Radio, color: "text-blue-400" },
    { label: "Ключевые слова", value: keywordCount, icon: Tag, color: "text-green-400" },
    { label: "Сообщения", value: messageCount, icon: MessageSquare, color: "text-yellow-400" },
    { label: "Дайджесты", value: digestCount, icon: Sparkles, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardPanel;
