import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, MessageCircle, Globe, MessageSquare } from "lucide-react";

const SourcesPanel = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        Источники
      </h1>

      <Tabs defaultValue="telegram" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Телеграм</span>
          </TabsTrigger>
          <TabsTrigger value="websites" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Сайты</span>
          </TabsTrigger>
          <TabsTrigger value="forums" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Форумы</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telegram" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Телеграм каналы</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Управление источниками из Телеграм каналов.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="websites" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Веб-сайты</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Управление источниками с веб-сайтов.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forums" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Форумы</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Управление источниками из форумов.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SourcesPanel;
