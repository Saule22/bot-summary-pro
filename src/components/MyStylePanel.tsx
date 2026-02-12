import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

const MyStylePanel = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Мой стиль</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Стиль написания
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Здесь вы сможете настроить стиль генерации контента: тон, формат, язык, шаблоны.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyStylePanel;
