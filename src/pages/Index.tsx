import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChannelsPanel from "@/components/ChannelsPanel";
import KeywordsPanel from "@/components/KeywordsPanel";
import MessagesPanel from "@/components/MessagesPanel";
import DigestPanel from "@/components/DigestPanel";
import { Bot, LogOut, Radio, Tag, MessageSquare, Sparkles } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Bot className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">AI Content Bot</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Выход
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4">
        <Tabs defaultValue="digest" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="digest" className="gap-2">
              <Sparkles className="h-4 w-4" /> <span className="hidden sm:inline">Дайджест</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-2">
              <Radio className="h-4 w-4" /> <span className="hidden sm:inline">Каналы</span>
            </TabsTrigger>
            <TabsTrigger value="keywords" className="gap-2">
              <Tag className="h-4 w-4" /> <span className="hidden sm:inline">Слова</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" /> <span className="hidden sm:inline">Сообщения</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="digest"><DigestPanel /></TabsContent>
          <TabsContent value="channels"><ChannelsPanel /></TabsContent>
          <TabsContent value="keywords"><KeywordsPanel /></TabsContent>
          <TabsContent value="messages"><MessagesPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
