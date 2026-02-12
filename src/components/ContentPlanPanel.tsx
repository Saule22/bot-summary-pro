import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

const ContentPlanPanel = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Контент-план</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Планирование контента
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Здесь будет ваш контент-план. Планируйте публикации, отслеживайте темы и управляйте расписанием.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContentPlanPanel;
