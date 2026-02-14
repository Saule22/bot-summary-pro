import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

const FindInfoPanel = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Search className="h-6 w-6 text-primary" />
        Найти информацию
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Поиск информации</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Раздел для поиска и анализа информации.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FindInfoPanel;
