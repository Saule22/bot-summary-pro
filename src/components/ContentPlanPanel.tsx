import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Plus,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Trash2,
  Edit,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

interface ContentPlan {
  id: string;
  user_id: string;
  title: string;
  content: string;
  scheduled_date: string;
  status: string;
  sort_order: number;
}

function DraggablePost({ post, onEdit, onDelete }: { post: ContentPlan; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: post,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-primary/20 text-primary",
    published: "bg-green-500/20 text-green-400",
  };

  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    scheduled: "Запланирован",
    published: "Опубликован",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-1 rounded-md border border-border bg-card p-2 text-sm hover:border-primary/50 transition-colors"
    >
      <button {...listeners} {...attributes} className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{post.title}</p>
        <Badge variant="outline" className={`mt-1 text-[10px] px-1.5 py-0 ${statusColors[post.status] || ""}`}>
          {statusLabels[post.status] || post.status}
        </Badge>
      </div>
      <div className="hidden group-hover:flex gap-0.5 shrink-0">
        <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-0.5">
          <Edit className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-0.5">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function DroppableDay({
  date,
  posts,
  onAddPost,
  onEditPost,
  onDeletePost,
}: {
  date: Date;
  posts: ContentPlan[];
  onAddPost: (date: Date) => void;
  onEditPost: (post: ContentPlan) => void;
  onDeletePost: (id: string) => void;
}) {
  const dateStr = format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const isToday = isSameDay(date, new Date());

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border min-h-[180px] transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-border"
      } ${isToday ? "border-primary/50" : ""}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
            {format(date, "EEEEEE", { locale: ru })}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {format(date, "d MMM", { locale: ru })}
          </span>
        </div>
        <button
          onClick={() => onAddPost(date)}
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        {posts.map((post) => (
          <DraggablePost
            key={post.id}
            post={post}
            onEdit={() => onEditPost(post)}
            onDelete={() => onDeletePost(post.id)}
          />
        ))}
      </div>
    </div>
  );
}

const ContentPlanPanel = () => {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPlan | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formStatus, setFormStatus] = useState("draft");
  const [activePost, setActivePost] = useState<ContentPlan | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 6);

  const { data: posts = [] } = useQuery({
    queryKey: ["content-plans", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_plans")
        .select("*")
        .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
        .order("sort_order");
      if (error) throw error;
      return data as ContentPlan[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (post: { id?: string; title: string; content: string; scheduled_date: string; status: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (post.id) {
        const { error } = await supabase
          .from("content_plans")
          .update({ title: post.title, content: post.content, scheduled_date: post.scheduled_date, status: post.status })
          .eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("content_plans")
          .insert({ title: post.title, content: post.content, scheduled_date: post.scheduled_date, status: post.status, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast.success(editingPost ? "Пост обновлён" : "Пост создан");
      closeDialog();
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-plans"] });
      toast.success("Пост удалён");
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await supabase.from("content_plans").update({ scheduled_date: newDate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["content-plans"] }),
  });

  function openAddDialog(date: Date) {
    setEditingPost(null);
    setFormDate(format(date, "yyyy-MM-dd"));
    setFormTitle("");
    setFormContent("");
    setFormStatus("draft");
    setDialogOpen(true);
  }

  function openEditDialog(post: ContentPlan) {
    setEditingPost(post);
    setFormDate(post.scheduled_date);
    setFormTitle(post.title);
    setFormContent(post.content || "");
    setFormStatus(post.status);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingPost(null);
  }

  function handleSave() {
    if (!formTitle.trim()) return;
    upsertMutation.mutate({
      id: editingPost?.id,
      title: formTitle.trim(),
      content: formContent,
      scheduled_date: formDate,
      status: formStatus,
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActivePost(event.active.data.current as ContentPlan);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;
    const postId = active.id as string;
    const newDate = over.id as string;
    const post = posts.find((p) => p.id === postId);
    if (post && post.scheduled_date !== newDate) {
      moveMutation.mutate({ id: postId, newDate });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Контент-план
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">
            {format(weekStart, "d MMM", { locale: ru })} — {format(weekEnd, "d MMM yyyy", { locale: ru })}
          </span>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => (
            <DroppableDay
              key={format(day, "yyyy-MM-dd")}
              date={day}
              posts={posts.filter((p) => p.scheduled_date === format(day, "yyyy-MM-dd"))}
              onAddPost={openAddDialog}
              onEditPost={openEditDialog}
              onDeletePost={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activePost ? (
            <div className="rounded-md border border-primary bg-card p-2 text-sm shadow-lg">
              <p className="font-medium">{activePost.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPost ? "Редактировать пост" : "Новый пост"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Заголовок поста" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            <Textarea placeholder="Описание / содержание" value={formContent} onChange={(e) => setFormContent(e.target.value)} rows={4} />
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Дата</label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground mb-1 block">Статус</label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="scheduled">Запланирован</SelectItem>
                    <SelectItem value="published">Опубликован</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Отмена</Button>
            <Button onClick={handleSave} disabled={!formTitle.trim() || upsertMutation.isPending}>
              {editingPost ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentPlanPanel;
