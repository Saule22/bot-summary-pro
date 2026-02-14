import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PenLine, Trash2, Copy, Loader2, Newspaper, Lightbulb, BookOpen, GalleryHorizontal, FileText, Send, Instagram, Music } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const TELEGRAM_CHANNEL_ID = "-1001143818214";

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  news: { label: "Жаңалықтар", icon: Newspaper, color: "bg-blue-500/10 text-blue-600" },
  ideas: { label: "Идеялар", icon: Lightbulb, color: "bg-yellow-500/10 text-yellow-600" },
  storytelling: { label: "Сторителлинг", icon: BookOpen, color: "bg-purple-500/10 text-purple-600" },
  carousel: { label: "Карусель", icon: GalleryHorizontal, color: "bg-green-500/10 text-green-600" },
  document: { label: "Құжаттан", icon: FileText, color: "bg-orange-500/10 text-orange-600" },
  general: { label: "Пост", icon: PenLine, color: "bg-muted text-muted-foreground" },
};

const WritePostPanel = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["generated-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("generated_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-posts"] });
      toast.success("Пост жойылды");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Көшірілді!");
  };

  const [postingToTelegram, setPostingToTelegram] = useState<string | null>(null);

  const postToTelegram = async (postId: string, content: string) => {
    setPostingToTelegram(postId);
    try {
      const { data, error } = await supabase.functions.invoke("post-to-telegram", {
        body: { text: content, chat_id: TELEGRAM_CHANNEL_ID },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success("Пост жарияланды Telegram каналға! ✅");
    } catch (err: any) {
      console.error("Telegram post error:", err);
      toast.error("Қате: " + (err.message || "Telegram-ға жіберу сәтсіз"));
    } finally {
      setPostingToTelegram(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <PenLine className="h-6 w-6 text-primary" />
        Жасалған посттар
      </h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !posts || posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PenLine className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Әзірге посттар жоқ.</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Telegram ботта контент жасаңыз — олар осында сақталады.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const config = typeConfig[post.type] || typeConfig.general;
            const Icon = config.icon;
            return (
              <Card key={post.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {post.title && <CardTitle className="text-sm font-medium">{post.title}</CardTitle>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString("kk-KZ", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48">
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  </ScrollArea>
                  {post.source && (
                    <p className="text-xs text-muted-foreground mt-2">📎 Көзі: {post.source}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(post.content)}>
                      <Copy className="h-3 w-3 mr-1" /> Көшіру
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#0088cc] border-[#0088cc]/30 hover:bg-[#0088cc]/10"
                      disabled={postingToTelegram === post.id}
                      onClick={() => postToTelegram(post.id, post.content)}
                    >
                      {postingToTelegram === post.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3 mr-1" />
                      )}
                      Telegram
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[#E1306C] border-[#E1306C]/30 hover:bg-[#E1306C]/10"
                      onClick={() => {
                        copyToClipboard(post.content);
                        window.open("https://www.instagram.com/saule__abisheva/", "_blank");
                      }}
                    >
                      <Instagram className="h-3 w-3 mr-1" /> Instagram
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-foreground border-border hover:bg-muted"
                      onClick={() => {
                        copyToClipboard(post.content);
                        window.open("https://www.tiktok.com/@online_business8", "_blank");
                      }}
                    >
                      <Music className="h-3 w-3 mr-1" /> TikTok
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(post.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Жою
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WritePostPanel;
