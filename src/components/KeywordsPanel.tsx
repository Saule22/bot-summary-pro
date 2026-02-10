import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const KeywordsPanel = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [word, setWord] = useState("");

  const { data: keywords = [] } = useQuery({
    queryKey: ["keywords"],
    queryFn: async () => {
      const { data, error } = await supabase.from("keywords").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addKeyword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("keywords").insert({ user_id: user!.id, word: word.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      setWord("");
      toast.success("Ключевое слово добавлено");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteKeyword = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("keywords").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["keywords"] });
      toast.success("Удалено");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Tag className="h-5 w-5 text-primary" /> Ключевые слова
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); addKeyword.mutate(); }} className="flex gap-2">
          <Input placeholder="Ключевое слово" value={word} onChange={(e) => setWord(e.target.value)} required className="flex-1" />
          <Button type="submit" size="icon" disabled={addKeyword.isPending}><Plus className="h-4 w-4" /></Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {keywords.map((kw: any) => (
            <Badge key={kw.id} variant="secondary" className="gap-1 py-1.5 pl-3 pr-1.5 text-sm">
              {kw.word}
              <button onClick={() => deleteKeyword.mutate(kw.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20">
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </Badge>
          ))}
          {keywords.length === 0 && <p className="text-sm text-muted-foreground">Добавьте слова для фильтрации</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default KeywordsPanel;
