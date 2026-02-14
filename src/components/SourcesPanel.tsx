import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const SourcesPanel = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        Источники
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Управление источниками</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Раздел для управления источниками контента.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SourcesPanel;
