import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PenLine } from "lucide-react";

const WritePostPanel = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <PenLine className="h-6 w-6 text-primary" />
        Написать пост
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Создание поста</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Раздел для создания и редактирования постов.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WritePostPanel;
